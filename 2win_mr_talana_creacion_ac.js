/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/runtime","N/https","N/task","N/error","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_busquedas.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js","./libs_talana_creacion_ac/DAO_controlador_errores.js"], function(runtime,https,task,errorModule,dao,daoCrearRegistros,controladorErrores) {

    /**
     * @function ejecutarPeticion - Realiza peticion a api.
     * @param {String} url - Url a la cual se realizara la peticion.
     * @param {String} token - Token de autorizacion para ejecutar la peticion.
     * @param {String} api - Identificador de api para la peticion.
     * @returns {Object} - Respuesta a la peticion.
     */
    function ejecutarPeticion(url, token, api) {
        try {
            log.audit("ejecutarPeticion - parametros recibidos", {
                "url": url,
                "token": token,
                "api": api,
            })

            // Construir cabecera 
            var headerObj = {
                "Content-Type": "text/plain",
                "Accept": "*/*",
                "Connection":"Keep-Alive",
                "Authorization": "Token " + token
            };

            // Cambiar url http por https
            var urlhttps = url.replace("http://", "https://");

            // Realizar peticion get
            var respuesta = https.get({
                url: urlhttps,
                headers: headerObj 
            });
            log.audit("ejecutarPeticion - respuesta", respuesta);
            
            // Validar codigo de respuesta 
            if (respuesta.code === 200) {
                // Parsear cuerpo respuesta
                var bodyParseado = JSON.parse(respuesta.body)
                return bodyParseado
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("002","ejecutarPeticion","Codigo de respuesta: " + respuesta.code + " a peticion: " + urlhttps + " respuesta: " + respuesta.body))
            }
        } catch (error) {
            log.error("ejecutarPeticion - error", error);

            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001","ejecutarPeticion",error.message))
            }
        }
    }

    /**
     * @function getInputData - Recupera parametros necesarios para la ejecucion del proceso.
     * @returns {Array} - Datos recuperados.
     */
    function getInputData() {
        try {
            // Recuperar datos del cluster
            var cluster = JSON.parse(runtime.getCurrentScript().getParameter("custscript_mr_talana_creacion_ac_cluster"))
            log.audit("getInputData - cluster", cluster)

            var datosScript = controladorErrores.obtenerDatosScript()
            cluster.proceso.datosScript = datosScript
            cluster.proceso.scriptId = datosScript.scriptId
            cluster.proceso.etapa = "getInputData"

            // Ejecutar peticion para recuperar acuerdos comerciales
            var respuestaAcuerdosComerciales = ejecutarPeticion(cluster.proceso.urlPeticionAcuerdosComerciales,cluster.token,cluster.proceso.api)

            // Array que almacenara todos los acuerdos comerciales recuperados
            var acuerdosComerciales = []

            // Evaluar si la propiedad results de la respuesta tiene elemetos
            if (respuestaAcuerdosComerciales.results.length > 0) {
                // Por cada elemento de la respuesta
                respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                    acuerdoComercial.proceso = cluster.proceso

                    // Anadir cada acuerdo comercial al array que almacena los acuerdos comerciales del cluster
                    acuerdosComerciales.push(acuerdoComercial)
                });

                var contador = 2
                // Mientras existan mas paginas
                while (respuestaAcuerdosComerciales.next !== null) { 
                    // Definir url y ejecutar peticion para recuperar siguiente pagina de acuerdos comerciales
                    var urlPeticionAcuerdosComerciales = respuestaAcuerdosComerciales.next
                    respuestaAcuerdosComerciales = ejecutarPeticion(urlPeticionAcuerdosComerciales,cluster.token,cluster.proceso.api)

                    // Evaluar si la propiedad results de la respuesta tiene elementos
                    if (respuestaAcuerdosComerciales.results.length > 0) {
                        // Por cada elemento de la respuesta
                        respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                            acuerdoComercial.proceso = cluster.proceso
                            acuerdoComercial.urlPeticionAcuerdosComerciales = urlPeticionAcuerdosComerciales

                            // Anadir cada acuerdo comercial de la pagina al array que almacena los acuerdos comerciales del cluster
                            acuerdosComerciales.push(acuerdoComercial)
                        });
                    } else {
                        log.error("getInputData - while - else - pagina sin elementos", respuestaAcuerdosComerciales)
                    }
                    contador += 1
                }

                log.debug("getInputData - acuerdosComercialesEx", acuerdosComerciales.length)

                return acuerdosComerciales
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("002","ejecutarPeticion","Cluster sin acuerdos comerciales: " + JSON.stringify(respuestaAcuerdosComerciales)))
            }
        } catch (error) {
            log.error("getInputData - error", error);

            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                cluster.proceso.etapa = error.cause.message.etapa
                cluster.proceso.estado = error.cause.message.code_error
                cluster.proceso.descripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                throw error
            } else {
                cluster.proceso.etapa = "getInputData" 
                cluster.proceso.estado = "001"
                cluster.proceso.descripcionResultado = error.message 
                daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                throw errorModule.create(controladorErrores.controladorErrores("001","getInputData",error.message))
            } 
        }          
    }

    /**
     * @function map - Procesar los datos recuperados.
     * @param {Object} context - Datos recuperados del getInputData.
     */
    function map(context) {
        try {   
            // Parsear value del getInputData
            var acuerdoComercial = JSON.parse(context.value);
            log.audit("map - key: " + context.key, {
                "extension": acuerdoComercial.length,
                "acuerdoComercial": acuerdoComercial
            });

            // Objeto que almacenara el acuerdo comercial y su razon social
            var acRs = {};

            // Recuperar datos del cluster
            var cluster = JSON.parse(runtime.getCurrentScript().getParameter("custscript_mr_talana_creacion_ac_cluster"))
            log.audit("map - cluster", cluster)

            var datosScript = controladorErrores.obtenerDatosScript()
            var tokenProceso = cluster.proceso.tokenProceso // acuerdoComercial.proceso.tokenProceso
            cluster.proceso.datosScript = datosScript
            cluster.proceso.scriptId = datosScript.scriptId
            cluster.proceso.etapa = "map"
            var proceso = cluster.proceso

            // Definir api, url y ejecutar peticion para recuperar detalle de acuerdo comercial
            var api = "detalleAcuerdoComercial"
            var urlPeticionDetalleAcuerdoComercial = cluster.urlBase + "m_commercialAgreement/" + acuerdoComercial.id + "/"
            var respuestaDetalleAcuerdoComercial = ejecutarPeticion(urlPeticionDetalleAcuerdoComercial,cluster.token,api)

            respuestaDetalleAcuerdoComercial.proceso = {
                "nombreProceso": "talana_creacion_ac",
                "nombreCluster": cluster.nombre,
                "idSubsidiaria": cluster.idSubsidiaria,
                "tokenPeticion": cluster.token,
                "api": api,
                "urlPeticionDetalleAcuerdoComercial": urlPeticionDetalleAcuerdoComercial,
                "terms": 2, // 30 Días
                "cuenta": '1-20-10-01',
                "artImpto": 17, // IVA_CL:S-CL, taxitem
                "estadocobranza": 2, // Aviso y Corte
                "lmryCodActecon": '',
                "lmry_subsidiary_country": 45, // custentity_lmry_subsidiary_country - chile
                "lmry_country": 1431, // custentity_lmry_country - CHILE
                "lmry_countrycode": 997, // custentity_lmry_countrycode
                "lmryAteconSii": '',
                "datosScript": proceso.datosScript,
                "scriptId": proceso.scriptId,
                "etapa": "map",
                "estado": "000",
                "tokenProceso": tokenProceso, 
                "descripcionResultado": "",
            }

            // Evaluar si el detalle recuperado tiene la propiedad payingCompany
            if (respuestaDetalleAcuerdoComercial.hasOwnProperty("payingCompany") ) {
                // Agregar propiedades estaticas al acuerdo comercial
                cluster.payingCompany = respuestaDetalleAcuerdoComercial.payingCompany

                // Definir api, url y ejecutar peticion para recuperar razon sociall 
                var api = "razonSocial"
                var urlPeticionRazonSocial = cluster.urlBase + "m_razonSocial/" + respuestaDetalleAcuerdoComercial.payingCompany + "/"
                var respuestaRazonSocial = ejecutarPeticion(urlPeticionRazonSocial,cluster.token,api)

                respuestaRazonSocial.proceso = {
                    "nombreProceso": "talana_creacion_ac",
                    "nombreCluster": cluster.nombre,
                    "idSubsidiaria": cluster.idSubsidiaria,
                    "api": api,
                    "urlPeticionRazonSocial": urlPeticionRazonSocial,
                    "tokenPeticion": cluster.token,
                    "datosScript": datosScript,
                    "scriptId": proceso.scriptId,
                    "etapa": "map",
                    "estado": "000",
                    "tokenProceso": tokenProceso,
                    "descripcionResultado": "",
                }

                // Evaluar si la razon social recuperada no tiene la propiedad id
                if (!respuestaRazonSocial.hasOwnProperty("id")) {
                    throw errorModule.create(controladorErrores.controladorErrores("002","map","Razon social: " +  JSON.stringify(respuestaRazonSocial) + " sin id")) 
                }

                cluster.razonSocial = respuestaRazonSocial
                acRs.razonSocial = respuestaRazonSocial
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("002","map","Acuerdo comercial: " +  JSON.stringify(respuestaDetalleAcuerdoComercial) + " sin payingCompany")) 
            } 
            cluster.acuerdoComercial = respuestaDetalleAcuerdoComercial
            acRs.acuerdoComercial = respuestaDetalleAcuerdoComercial
            log.debug("map - acRs", acRs)

            context.write(acRs.acuerdoComercial.id,acRs);
        } catch (error) {
            log.error("map - error", error);
            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                cluster.proceso.etapa = error.cause.message.etapa
                cluster.proceso.estado = error.cause.message.code_error
                cluster.proceso.descripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                cluster.proceso = daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                // context.write(cluster.cluster.proceso.nombreCluster, cluster.cluster.proceso.registroAuditoria);
                // throw error
            } else {
                cluster.proceso.etapa = "map" 
                cluster.proceso.estado = "001"
                cluster.proceso.descripcionResultado = error.message 
                cluster.proceso = daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                // context.write(cluster.cluster.proceso.nombreCluster, cluster.cluster.proceso.registroAuditoria);
                // throw errorModule.create(controladorErrores.controladorErrores("001","map",error.message))
            } 
        }
    }

    /**
     * @function reduce - Procesar los datos recuperados.
     * @param {Object} context - Datos recuperados de etapa map.
     */
    function reduce(context) {
        try {
            log.debug("reduce - key: " + context.key, {
                "extension": context.values.length,
                "values": context.values
            });

            // Parsear value de reduce
            var acRs = JSON.parse(context.values[0]);

            if (acRs.acuerdoComercial.proceso.estado === "000" && acRs.razonSocial.proceso.estado === "000") {
                acRs.razonSocial.proceso.externalId = acRs.razonSocial.proceso.nombreCluster + "_" + acRs.razonSocial.id + "_" + acRs.acuerdoComercial.id

                acRs.razonSocial.proceso.etapa = "reduce"
                // Ejecutar busqueda para determinar si registro ya existe
                var customerExistente = dao.busquedaCustomer(acRs.razonSocial.proceso.externalId)
                
                // Si el registro ya existe
                if (customerExistente.length > 0) {
                    acRs.razonSocial.proceso.estado = "001"
                    acRs.razonSocial.proceso.tipoRegistroCreado = ""
                    acRs.razonSocial.proceso.idRegistroCreado = "ya existe registro custumer: " + customerExistente[0].internalId
                    acRs.razonSocial.proceso.entityid = customerExistente[0].internalId
                    acRs.razonSocial.proceso.descripcionResultado = "Ya existe customer para acuerdo comercial: " + acRs.acuerdoComercial.id
                } else {
                    // Crear registro customer
                    acRs = daoCrearRegistros.crearCliente(acRs)

                    // Crear contacto
                    acRs = daoCrearRegistros.getContacto(acRs);

                    // Crear registro personalizado de AutomaticSet
                    acRs.razonSocial.proceso.lmry_automaticSet = {
                        "lmry_us_entity": acRs.razonSocial.proceso.idRegistroCreado,
                        "lmry_us_entity_type": 4, //'Customer',
                        "lmry_us_country": 45, //'CL',
                        "lmry_us_subsidiary": acRs.razonSocial.proceso.idSubsidiaria,
                        "lmry_us_transaction": 7, //'Invoice',
                        "lmry_document_type": 389, //'Factura Electronica',
                        "lmry_paymentmethod": 359, //'CL - Pago a Cta. Cte.',
                        "lmry_doc_ref_type": 389
                    };
                    acRs = daoCrearRegistros.creaAutomaticSet(acRs);  
                }

                // Crear reporte
                acRs.razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(acRs.razonSocial.proceso)
                log.debug("reduce - acRs",acRs)
            } 

            context.write(acRs.razonSocial.proceso.nombreCluster, acRs.razonSocial.proceso);
        } catch (error) {
            log.error("reduce - error", error);
            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                acRs.razonSocial.proceso.etapa = error.cause.message.etapa
                acRs.razonSocial.proceso.estado = error.cause.message.code_error
                acRs.razonSocial.proceso.descripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                acRs.razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(acRs.razonSocial.proceso)
                context.write(acRs.razonSocial.proceso.nombreCluster, acRs.razonSocial.proceso);
                // throw error
            } else {
                acRs.razonSocial.proceso.etapa = "reduce" 
                acRs.razonSocial.proceso.estado = "001"
                acRs.razonSocial.proceso.descripcionResultado = error.message 
                acRs.razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(acRs.razonSocial.proceso)
                context.write(acRs.razonSocial.proceso.nombreCluster, acRs.razonSocial.proceso);
                // throw errorModule.create(controladorErrores.controladorErrores("001","reduce",error.message))
            } 
        }
    }

    /**
     * @function summarize - Resumen de la ejecucion.
     * @param {object} summary - Datos que resumen ejecucion del script.
     */
    function summarize(summary) {
        try {
            // Recuperar parametros
            var cluster = JSON.parse(runtime.getCurrentScript().getParameter("custscript_mr_talana_creacion_ac_cluster"))
            log.audit("summarize - cluster", cluster)

            var datosScript = controladorErrores.obtenerDatosScript()
            cluster.proceso.datosScript = datosScript
            cluster.proceso.scriptId = datosScript.scriptId
            cluster.proceso.etapa = "summarize"

            var registrosCreados = {};
            registrosCreados[cluster.nombre] = []

            // Recuperar a los pares key-value pasados desde el reduce 
            summary.output.iterator().each(function(key, value) {
                var value = JSON.parse(value)
                registrosCreados[key].push({
                    "idRegistroCreado": value.idRegistroCreado,
                    "registroAuditoria": value.registroAuditoria
                });
                return true;
            });
            log.debug("summarize - registrosCreados", registrosCreados)
            log.debug("summarize - registrosCreados - " + cluster.nombre, registrosCreados[cluster.nombre].length)

            // Recuperar errores
            summary.mapSummary.errors.iterator().each(function(key, value) {
                log.error("summarize - mapSummaryerrors: " + key,  value);
                return true;
            });

            // Recuento de unidades de procesamiento usadas y restantes
            log.debug("summarize - summary", summary);
            log.audit("summarize - summary etapas", {
                "getInputData": summary.inputSummary,
                "map": summary.mapSummary,
                "reduce": summary.reduceSummary
            });
            var scriptObj = runtime.getCurrentScript();
            log.debug("summarize - unidades restantes: ", scriptObj.getRemainingUsage())

            // Sumar 1 al numero de ejecucion y enviar tarea al script scheduled
            cluster.proceso.numeroEjecucion += 1
            if (cluster.proceso.numeroEjecucion < cluster.proceso.numeroMaximoEjecuciones) {
                var tarea = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: "customscript_2win_sd_talana_creacion_ac",  
                    deploymentId: "customdeploy_2win_sd_talana_creacion_ac",
                    params: {
                        "custscript_sd_talana_creacion_ac_ejecuci": cluster.proceso.numeroEjecucion
                    }
                });
                log.audit("summarize - tarea",  tarea)
    
                // Enviar tarea
                var tareaId = tarea.submit();
                log.debug("summarize - tareaId", tareaId)
    
                // Monitoreo tarea
                var statusTarea = task.checkStatus({ taskId: tareaId });
                log.audit("summarize - statusTarea", statusTarea);
            }

        } catch (error) {
            log.error("summarize - error", error); 

            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                cluster.proceso.etapa = error.cause.message.etapa
                cluster.proceso.estado = error.cause.message.code_error
                cluster.proceso.descripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                // throw error
            } else {
                cluster.proceso.etapa = "summarize" 
                cluster.proceso.estado = "001"
                cluster.proceso.descripcionResultado = error.message 
                daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                // throw errorModule.create(controladorErrores.controladorErrores("001","summarize",error.message))
            }
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});