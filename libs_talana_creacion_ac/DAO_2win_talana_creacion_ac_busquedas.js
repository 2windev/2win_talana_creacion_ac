/**
 * @NApiVersion 2.x
 * @module ./DAO.js
 * @NModuleScope Public
 */
define(["N/search","N/error","./DAO_controlador_errores.js"], function(search,errorModule,controladorErrores){

    /**
     * @function obtenerResultados
     * @param {{"type": String,"filters": Array,"columns": Array}} createSearch - Objeto con parametros para la busqueda
     * @returns {Array} - Resultados de la busqueda
     */
    function obtenerResultados (createSearch)  {
        try {
            log.audit("obtenerResultados - createSearch", {
                "type": createSearch.type,
                "filters": createSearch.filters,
            })

            // Array que almacenara resultados
            var searchResults = [];

            var saveSearch = search.create(createSearch);
            var searchResultCount;

            // Ejecutar busqueda estandar
            searchResultCount = saveSearch.runPaged().count;
            if (searchResultCount == 0) {
                log.debug("obtenerResultados - searchResultCount","la busqueda no retorno resultados")
                return searchResultCount
            }
            saveSearch.run().each(function (item) {
                var objectCompiled = {};
                for (var i = 0; i < item.columns.length; i++) {
                    objectCompiled[item.columns[i].label] = item.getValue(item.columns[i]);
                }
                searchResults.push(objectCompiled);
                return true;
            });

            return searchResults;
        } catch (error) {
            log.error("obtenerResultados - error", error.message)
            if (error.name === 'ERROR_PERSONALIZADO') {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("003","obtenerResultados",error.message))
            }
        }
    };

    /**
     * @function busquedaCustomer - Función para realizar una busqueda en una tabla de netsuite.
     * @param externalId - Parametro para el filtro de la busqueda.
     * @returns {Array | Error} Resultados de la busqueda o mensaje de error.
     */
    function busquedaCustomer(externalId) {
        try{
            log.debug("busquedaCustomer - externalId", {
                "externalId": externalId,
                "tipoDato": typeof(externalId)
            })

            // Tipo, filtros y columnas para la busqueda
            var objSearch = {
                type: "customer",
                filters: [
                    ["externalid","is",externalId]
                ],
                columns: [
                    search.createColumn({name: "internalid", label: "internalId"}),
                    search.createColumn({name: "entityid", label: "entityid"}),
                    search.createColumn({name: "custentity_lmry_sv_taxpayer_number", label: "taxPayerNumber"}),
                    search.createColumn({name: "companyname", label: "companyname"}),
                    search.createColumn({name: "custentity_lmry_digito_verificator", label: "digitoVerificador"}),
                    search.createColumn({name: "custentity_tal_commercialaggrdetails", label: "detalleAcuerdoComercial"})
                ]
            };

            // Ejecutar busqueda
            var result = obtenerResultados(objSearch);
            log.debug("busquedaCustomer - result", {
                "extension": result.length,
                "result": result
            })

            return result 
        }catch(error){
            log.error("busquedaCustomer - error", JSON.stringify(error.message));
            if (error.name === 'ERROR_PERSONALIZADO') {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("003","busquedaCustomer",error.message))
            }
        }
    } 

     /**
     * @description Función que se utiliza para generar Token tabla Auditoria.
     * @function obtenerToken.
     */
     function obtenerToken() {
        var uuid = "", i, random;
        for (i = 0; i < 32; i++) {
            random = Math.random() * 16 | 0;

            if (i == 8 || i == 12 || i == 16 || i == 20) {
                uuid += "-"
            }
            uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8)  : random))
                .toString(16);
        }
        var existsToken = validarToken(uuid);

        if (existsToken.length > 0) obtenerToken();
        else return uuid;
    }

    /**
     * @function validarToken - Función para realizar una busqueda en una tabla de netsuite
     * @param {string} token - Parametro usado en el filtro de la busqueda
     * @returns {Array} - Resultado de busqueda
     */
    function validarToken(token) {
        try {
            // Tipo, filtros y columnas para la busqueda
            var objSearch = {
                type: "customrecord_2win_auditoria",
                filters: [
                    ["custrecord_2win_auditoria_token", "contains", token]
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "internal_id" })
                ]
            }
    
            // Ejecutar busqueda
            var result = obtenerResultados(objSearch);
            log.audit("validarToken - resultados", {
                "extension": result.length,
                "resultado": result
            });
            return result;
        } catch (error) {
            log.error("validarToken - error", error.message);
            if (error.name === 'ERROR_PERSONALIZADO') {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001","validarToken",error.message))
            }
        }
    }

    /**
     * @function busquedaClustersActivos - Función para realizar una busqueda en una tabla de netsuite
     * @returns {Array} - Resultado de busqueda
     */
    function busquedaClustersActivos() {
        try {
            // Tipo, filtros y columnas para la busqueda
            var objSearch = {
                type: "customrecord_2win_cluster_talana",
                filters: [
                   ["custrecord_2win_cluster_talana_activo","is",true]
                ],
                columns: [
                    search.createColumn({name: "internalid", label: "internalId"}),
                    search.createColumn({name: "custrecord_2win_cluster_talana_nombre", label: "nombre" }),
                    search.createColumn({name: "custrecord_2win_cluster_talana_subsidiar", label: "idSubsidiaria"}), 
                    search.createColumn({name: "custrecord_2win_cluster_talana_url_base", label: "urlBase"}),
                    search.createColumn({name: "custrecord_2win_cluster_talana_token", label: "token"}),
                    search.createColumn({name: "custrecord_2win_cluster_talana_activo", label: "activo"}),
                    search.createColumn({name: "custrecord_2win_cluster_talana_fecha_act", label: "ultimaFechaActualizacion"}),
                    search.createColumn({name: "formulatext", formula: "TO_CHAR({today},'YYYY-MM-DD')", label: "stringFechaActual"})
                ]
            }
    
            // Ejecutar busqueda
            var result = obtenerResultados(objSearch);
            log.audit("busquedaClustersActivos - resultados", {
                "extension": result.length,
                "resultado": result
            });

            // Valida que la busqueda retorne resultados
            if (result.length > 0) {
                return result;
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("002","busquedaClustersActivos","No se encontro resultados en customrecord_2win_cluster_talana"))
            }
        } catch (error) {
            log.error("busquedaClustersActivos - error", error.message);
            if (error.name === 'ERROR_PERSONALIZADO') {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001","busquedaClustersActivos",error.message))
            }
        }
    }

    return {
        busquedaCustomer:busquedaCustomer,
        obtenerToken: obtenerToken,
        busquedaClustersActivos: busquedaClustersActivos
    }
});