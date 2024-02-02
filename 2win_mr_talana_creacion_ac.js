/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/runtime","N/https","N/record","N/error","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_busquedas.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js","./libs_talana_creacion_ac/DAO_controlador_errores.js"], function(runtime,https,record,errorModule,dao,daoCrearRegistros,controladorErrores) {

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
                "tipoDato": typeof(url),
                "token": token,
                "tipoDato2": typeof(token),
                "api": api,
                "tipoDato3": typeof(api),
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
            log.debug("ejecutarPeticion - url", urlhttps)

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
                log.debug("ejecutarPeticion - bodyParseado",bodyParseado );
                return bodyParseado
            } else {
                if (api === "detalleAcuerdoComercial" || api === "razonSocial") {
                    // Parsear cuerpo respuesta
                    var bodyParseado = JSON.parse(respuesta.body)
                    log.error("ejecutarPeticion - error",bodyParseado );
                    return bodyParseado
                } else {
                    throw errorModule.create(controladorErrores.controladorErrores("002","ejecutarPeticion","Codigo de respuesta: " + respuesta.code + " a peticion: " + urlhttps + " respuesta: " + respuesta.body))
                }
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
            // Recuperar parametros
            var cluster = JSON.parse(runtime.getCurrentScript().getParameter("custscript_mr_talana_creacion_ac_cluster"))
            log.audit("getInputData - cluster", cluster)

            var datosScript = controladorErrores.obtenerDatosScript()
            var tokenProceso = cluster.proceso.tokenProceso
            cluster.proceso.datosScript = datosScript
            cluster.proceso.scriptId = datosScript.scriptId
            cluster.proceso.etapa = "getInputData"
            var proceso = cluster.proceso


            // Ejecutar peticion para recuperar acuerdos comerciales
            var respuestaAcuerdosComerciales = ejecutarPeticion(cluster.proceso.urlPeticionAcuerdosComerciales,cluster.token,cluster.proceso.api)

            // Array que almacenara los acuerdos comerciales recuperados
            var acuerdosComerciales = []

            // Evaluar si la propiedad results de la respuesta tiene elemetos
            if (respuestaAcuerdosComerciales.results.length > 0) {
                // Por cada cada acuerdo comercial del array results
                respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                    acuerdoComercial.proceso = cluster.proceso
                    log.debug("getInputData - acuerdoComercial", acuerdoComercial)

                    // Anadir cada acuerdo comercial al array que almacena los acuerdos comerciales del cluster
                    acuerdosComerciales.push(acuerdoComercial)
                });

                var contador = 0
                /**@todo - Reemplazar: contador < 2 por respuestaAcuerdosComerciales.next !== null */
                // Mientras existan mas paginas
                while (contador < 1) { // respuestaAcuerdosComerciales.next !== null
                    cluster.proceso.urlPeticionAcuerdosComerciales = respuestaAcuerdosComerciales.next
                    // Ejecutar peticion para recuperar siguiente paginaacuerdos comerciales
                    respuestaAcuerdosComerciales = ejecutarPeticion(cluster.proceso.urlPeticionAcuerdosComerciales,cluster.token,cluster.proceso.api)

                    // Evaluar si la propiedad results de la respuesta tiene elementos
                    if (respuestaAcuerdosComerciales.results.length > 0) {
                        respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                            acuerdoComercial.proceso = cluster.proceso
                            log.debug("getInputData - while - if - acuerdoComercial", acuerdoComercial)

                            // Anadir cada acuerdo comercial de la pagina al array que almacena los acuerdos comerciales del cluster
                            acuerdosComerciales.push(acuerdoComercial)
                        });
                    } else {
                        log.error("getInputData - while - else - acuerdoComercial", acuerdoComercial)
                    }

                    contador += 1
                }

                // Agregar los acuerdos comercuales recuperados al cluster
                cluster.proceso.acuerdosComerciales = acuerdosComerciales

                // Arrays que alamecenaran los id payingCompany y los acuerdos comerciales con detalle
                var payingCompanys = []
                var acuerdosComercialesConDetalle = []

                // Por cada acuerdo comercial recuperado
                cluster.proceso.acuerdosComerciales.forEach(function (acuerdoComercial) {
                    // Definir api y url para la peticion
                    var api = "detalleAcuerdoComercial"
                    var urlPeticionDetalleAcuerdoComercial = cluster.urlBase + "m_commercialAgreement/" + acuerdoComercial.id + "/"

                    // Ejecutar peticion para recuperar el detalle de cada acuerdo comercial
                    var respuestaDetalleAcuerdoComercial = ejecutarPeticion(urlPeticionDetalleAcuerdoComercial,cluster.token, api)

                    respuestaDetalleAcuerdoComercial.proceso = {
                        "nombreProceso": "talana_creacion_ac",
                        "nombreCluster": cluster.nombre,
                        "idSubsidiaria": cluster.idSubsidiaria,
                        "tokenPeticion": cluster.token,
                        "api": api,
                        "urlPeticionDetalleAcuerdoComercial": urlPeticionDetalleAcuerdoComercial,
                        "datosScript": proceso.datosScript,
                        "scriptId": proceso.scriptId,
                        "etapa": "getInputData",
                        "estado": "000",
                        "tokenProceso": tokenProceso, 
                        "decripcionResultado": "",
                    }

                    // Evaluar si el acuerdo comercial recuperado tiene la propiedad payingCompany
                    if (respuestaDetalleAcuerdoComercial.hasOwnProperty("payingCompany") ) {
                        // Aislar payingCompany
                        // Comprobar si el elemento ya existe en el array
                        if (!payingCompanys.includes(respuestaDetalleAcuerdoComercial.payingCompany)) {
                            // Si no existe, agregarlo al array
                            payingCompanys.push(respuestaDetalleAcuerdoComercial.payingCompany);
                        }
                    } else {
                        respuestaDetalleAcuerdoComercial.proceso.estado = "002" 
                        respuestaDetalleAcuerdoComercial.proceso.decripcionResultado = "Acuerdo comercial sin payingCompany"
                    }

                    log.debug("getInputData - respuestaDetalleAcuerdoComercial", respuestaDetalleAcuerdoComercial)
                    acuerdosComercialesConDetalle.push(respuestaDetalleAcuerdoComercial)

                });

                // Añadir los payingCompany y acuerdos comerciales al cluster
                cluster.proceso.payingCompanys = payingCompanys
                cluster.proceso.acuerdosComercialesConDetalle = acuerdosComercialesConDetalle

                // Arrays que almacenaran las razones sociales y los acuerdos comerciales junto a su razon social 
                var razonesSociales = []
                var agrupadosAcRs = []

                // Por cada payingCompany
                cluster.proceso.payingCompanys.forEach(payingCompany => {
                    // Definir api y url a usar para la peticion que recupera la razon social 
                    var api = "razonSocial"
                    var urlPeticionRazonSocial = cluster.urlBase + "m_razonSocial/" + payingCompany + "/"

                    // Ejecutar peticion para recuperar la razon social
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
                        "etapa": "getInputData",
                        "estado": "000",
                        "tokenProceso": tokenProceso,
                        "decripcionResultado": "",
                    }

                    // Evaluar si la razon social recuperada no tiene la propiedad id
                    if (!respuestaRazonSocial.hasOwnProperty("id")) {
                        respuestaRazonSocial.proceso.etapa = "ejecutarPeticion" 
                        respuestaRazonSocial.proceso.estado = "002" 
                        respuestaRazonSocial.proceso.decripcionResultado = "Razon social sin id" 
                    } 

                    razonesSociales.push(respuestaRazonSocial)

                    // Recorrer acuerdos comerciales recuperados
                    cluster.proceso.acuerdosComercialesConDetalle.forEach(acuerdoComercialConDetalle => {
                        if (acuerdoComercialConDetalle.payingCompany === respuestaRazonSocial.id) {
                            var objetoDatosParaCustomer = {
                                "acuerdoComercial": acuerdoComercialConDetalle,
                                "razonSocial": respuestaRazonSocial
                            }

                            agrupadosAcRs.push(objetoDatosParaCustomer)
                        } 
                    });
                });

                // Agreagar las razones sociales recuperadas y su emparejamiento con el acurdo comercial al cluster
                cluster.proceso.razonesSociales = razonesSociales
                cluster.proceso.agrupadosAcRs = agrupadosAcRs

                log.debug("getInputData - acuerdosComerciales", cluster.proceso.acuerdosComerciales.length)
                log.debug("getInputData - payingCompanys", cluster.proceso.payingCompanys.length)
                log.debug("getInputData - agrupadosAcRs", cluster.proceso.agrupadosAcRs.length)

                return [cluster.proceso.agrupadosAcRs[0],cluster.proceso.agrupadosAcRs[1],cluster.proceso.agrupadosAcRs[2]]
            } else {
                // Crear reporte
                cluster.proceso.etapa = "ejecutarPeticion"
                cluster.proceso.estado = "002"
                cluster.proceso.decripcionResultado = "Cluster sin acuerdos comerciales: " + JSON.stringify(respuestaAcuerdosComerciales)
                cluster.proceso = daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
            }
        } catch (error) {
            log.error("getInputData - error", error.message);

            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                cluster.proceso.etapa = error.cause.message.etapa
                cluster.proceso.estado = error.cause.message.code_error
                cluster.proceso.decripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                // throw error
            } else {
                cluster.proceso.etapa = "getInputData" 
                cluster.proceso.estado = "001"
                cluster.proceso.decripcionResultado = error.message 
                daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                // throw errorModule.create(controladorErrores.controladorErrores("001","getInputData",error.message))
            } 
        }          
    }

    /**
     * @function map - Procesar los datos recuperados.
     * @param {Object} context - Datos recuperados del getInputData.
     */
    function map(context) {
        try {   
            log.debug("map - context", context);

            // Parsear value de map
            var agrupadosAcRs = JSON.parse(context.value);
            log.audit("map - key: " + context.key, agrupadosAcRs);

            if (agrupadosAcRs.acuerdoComercial.proceso.estado === "000" && agrupadosAcRs.razonSocial.proceso.estado === "000") {
                agrupadosAcRs.razonSocial.proceso.externalId = agrupadosAcRs.razonSocial.proceso.nombreCluster + "_" + agrupadosAcRs.razonSocial.id + "_" + agrupadosAcRs.acuerdoComercial.id

                // Ejecutar busqueda para determinar si registro ya existe
                var customerExistente = dao.busquedaCustomer(agrupadosAcRs.razonSocial.proceso.externalId)
                
                // Si el registro ya existe
                if (customerExistente.length > 0) {
                    agrupadosAcRs.razonSocial.proceso.tipoRegistroCreado = ""
                    agrupadosAcRs.razonSocial.proceso.idRegistroCreado = "ya existe registro custumer: " + customerExistente[0].internalId
                    agrupadosAcRs.razonSocial.proceso.entityid = customerExistente[0].internalId
                    agrupadosAcRs.razonSocial.proceso.decripcionResultado = "custumer ya existe"
                    agrupadosAcRs.razonSocial.proceso.atapa = "map"
                    agrupadosAcRs.razonSocial.proceso.estado = "001"
                    /**@todo - Actualizar registro*/  
                    // agrupadosAcRs = daoCrearRegistros.actualizarCliente(agrupadosAcRs)
                } else {
                    // Crear customer
                    agrupadosAcRs = daoCrearRegistros.crearCliente(agrupadosAcRs)
                    agrupadosAcRs.razonSocial.proceso.etapa = "crearReporteAuditoria"
                    agrupadosAcRs.razonSocial.proceso.decripcionResultado = "OK"
                }

                // Crear reporte
                agrupadosAcRs.razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(agrupadosAcRs.razonSocial.proceso)
                log.debug("map - agrupadosAcRs",agrupadosAcRs)
            } 

            context.write(agrupadosAcRs.razonSocial.proceso.nombreCluster, agrupadosAcRs.razonSocial.proceso);
        } catch (error) {
            log.error("map - error", error.message);
            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                agrupadosAcRs.razonSocial.proceso.etapa = error.cause.message.etapa
                agrupadosAcRs.razonSocial.proceso.estado = error.cause.message.code_error
                agrupadosAcRs.razonSocial.proceso.resultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                agrupadosAcRs.razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(agrupadosAcRs.razonSocial.proceso)
                context.write(agrupadosAcRs.razonSocial.proceso.nombreCluster, agrupadosAcRs.razonSocial.proceso.registroAuditoria);
                throw error
            } else {
                agrupadosAcRs.razonSocial.proceso.etapa = "map" 
                agrupadosAcRs.razonSocial.proceso.estado = "001"
                agrupadosAcRs.razonSocial.proceso.resultado = error.message 
                agrupadosAcRs.razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(agrupadosAcRs.razonSocial.proceso)
                context.write(agrupadosAcRs.razonSocial.proceso.nombreCluster, agrupadosAcRs.razonSocial.proceso.registroAuditoria);
                throw errorModule.create(controladorErrores.controladorErrores("001","map",error.message))
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
            var tokenProceso = cluster.proceso.tokenProceso
            cluster.proceso.datosScript = datosScript
            cluster.proceso.scriptId = datosScript.scriptId
            cluster.proceso.etapa = "summarize"
            var proceso = cluster.proceso

            var registrosAuditoria = {};
            registrosAuditoria[cluster.nombre] = []
            // Operar soobre los pares key-value pasados desde el reduce 
            summary.output.iterator().each(function(key, value) {
                var value = JSON.parse(value)
                registrosAuditoria[key].push({
                    "idRegistroCreado": value.idRegistroCreado,
                    "registroAuditoria": value.registroAuditoria
                });
                return true;
            });
            log.debug("summarize - registrosAuditoria", registrosAuditoria)

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

        } catch (error) {
            log.error("summarize - error", error.message); 

            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                proceso.etapa = error.cause.message.etapa
                proceso.estado = error.cause.message.code_error
                proceso.resultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                daoCrearRegistros.crearReporteAuditoria(proceso)
                // throw error
            } else {
                proceso.etapa = "summarize" 
                proceso.estado = "001"
                proceso.resultado = error.message 
                daoCrearRegistros.crearReporteAuditoria(proceso)
                // throw errorModule.create(controladorErrores.controladorErrores("001","summarize",error.message))
            }
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    }
});