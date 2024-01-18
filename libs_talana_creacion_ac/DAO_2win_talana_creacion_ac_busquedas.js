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
                "tipoDato": typeof(createSearch)
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
            log.debug("obtenerResultados - ejecutada","Obtuvo resultados")

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
                columns:[
                    search.createColumn({name: "internalid", label: "internalId"}),
                    search.createColumn({name: "entityid", label: "entityid"}),
                    search.createColumn({name: "custentity_lmry_sv_taxpayer_number", label: "taxPayerNumber"}),
                    search.createColumn({name: "companyname", label: "companyname"}),
                    search.createColumn({name: "custentity_lmry_digito_verificator", label: "digitoVerificador"}),
                    // search.createColumn({name: "defaultaddress", label: "defaultAddress"}),
                    search.createColumn({name: "custentity_tal_commercialaggrdetails", label: "detalleAcuerdoComercial"})
                ]
            };
            var result = obtenerResultados(objSearch);

            log.debug("busquedaCustomer - result", {
                "extencionResultado": result.length,
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

    return {
        busquedaCustomer:busquedaCustomer,
    }
});