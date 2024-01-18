/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/https","N/error","./libs_talana_creacion_ac/DAO_controlador_errores.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_busquedas.js"], function(https,errorModule,controladorErrores,daoCrearRegistros,dao){

    // Definir variable con datos del proceso
    var proceso = {
        "datosScript": {},
        "etapa": "",
        "estado": "000",
        "tokenProceso": "", 
        "resultado": "",
    }

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
                if (api === "acuerdosComerciales" || api === "detalleAcuerdoComercial" || api === "razonSocial" ) {
                    // Parsear cuerpo respuesta
                    var bodyParseado = JSON.parse(respuesta.body)
                    log.error("ejecutarPeticion - error",bodyParseado );
                    return bodyParseado
                } else {
                    throw errorModule.create(controladorErrores.controladorErrores("002","ejecutarPeticion",respuesta.body))
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
     * @function ejecutarTarea - Lanzar proceso en ejecucion de script. 
     */
    function ejecutarTarea () {
        try {
            proceso.datosScript = controladorErrores.obtenerDatosScript()
            proceso.etapa = "ejecutarTarea"

            // Recuperar los cluster y sus datos
            var clusters = [
                {
                    "id": "CL_Master",
                    "urlBase": "http://qa-internal.talana.dev/facturacion/api/",
                    "token": "61bfc7af41f5856a1d7e0d9533b83d0187a57e06",
                }
            ]

            // Recorrer cada cluster y sus datos
            for (var index = 0; index < clusters.length; index++) {
                clusters[index].proceso = {
                    "idCluster": clusters[index].id,
                    "api": "acuerdosComerciales",
                    "urlPeticionAcuerdosComerciales": clusters[index].urlBase + "m_commercialAgreement/",
                    "tokenPeticion": clusters[index].token,
                    "datosScript": controladorErrores.obtenerDatosScript(),
                    "etapa": "ejecutarTarea",
                    "estado": "000",
                    "tokenProceso": "", 
                    "resultado": "",
                }
                log.debug("ejecutarTarea - clusters[" + index + "]", clusters[index])

                var acuerdosComercialesDeCluster = []

                // ejecutar peticion para recuperar acuerdos comerciales
                var respuestaAcuerdosComerciales = ejecutarPeticion(clusters[index].proceso.urlPeticionAcuerdosComerciales, clusters[index].proceso.tokenPeticion, clusters[index].proceso.api)

                // Si la respuesta tiene resultados
                if (respuestaAcuerdosComerciales.results.length > 0) {

                    // Por cada cada acuerdo comercial del array results
                    respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                        acuerdoComercial.proceso = clusters[index].proceso
                        log.debug("ejecutarTarea - acuerdoComercial", acuerdoComercial)
                        // Anadir cada acuerdo comercial al array que almacena los acuerdos comerciales del cluster
                        acuerdosComercialesDeCluster.push(acuerdoComercial)
                    });

                    var contador = 0
                    /**@todo - Reemplazar: contador < 2 por respuestaAcuerdosComerciales.next !== null */
                    // Mientras existan mas paginas
                    while (contador < 1) { // respuestaAcuerdosComerciales.next !== null
                        clusters[index].proceso.urlPeticionAcuerdosComerciales = respuestaAcuerdosComerciales.next
                        // ejecutar peticion para recuperar siguiente paginaacuerdos comerciales
                        respuestaAcuerdosComerciales = ejecutarPeticion(clusters[index].proceso.urlPeticionAcuerdosComerciales, clusters[index].proceso.tokenPeticion, clusters[index].proceso.api)

                        if (respuestaAcuerdosComerciales.results.length > 0) {
                            respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                                acuerdoComercial.proceso = clusters[index].proceso
                                log.debug("ejecutarTarea - while - if - acuerdoComercial", acuerdoComercial)
                                // Anadir cada acuerdo comercial de la pagina al array que almacena los acuerdos comerciales del cluster
                                acuerdosComercialesDeCluster.push(acuerdoComercial)
                            });
                        } else {
                            log.error("ejecutarTarea - while - else - acuerdoComercial", acuerdoComercial)
                        }

                        contador += 1
                    }

                    // Agregar los acuerdos comerciales recuperados al cluster
                    clusters[index].proceso.acuerdosComercialesDeCluster = acuerdosComercialesDeCluster
                    log.debug("ejecutarTarea - acuerdosComercialesDeCluster", clusters[index].proceso.acuerdosComercialesDeCluster.length)
    
                    // Declarar array que almacenara cada detalle de los acuerdos comerciales
                    var acuerdosComercialesConDetalle = []
    
                    // Por cada acuerdo comercial
                    clusters[index].proceso.acuerdosComercialesDeCluster.forEach(function (acuerdoComercial) {
                        // Definir api y url para la peticion
                        var api = "detalleAcuerdoComercial"
                        var urlPeticionDetalleAcuerdoComercial = clusters[index].urlBase + "m_commercialAgreement/" + acuerdoComercial.id + "/"
    
                        // Ejecutar peticion para recuperar el detalle de cada acuerdo comercial
                        var respuestaDetalleAcuerdoComercial = ejecutarPeticion(urlPeticionDetalleAcuerdoComercial, acuerdoComercial.proceso.tokenPeticion, api)
    
                        respuestaDetalleAcuerdoComercial.proceso = {
                            "idCluster": clusters[index].id,
                            "tokenPeticion": clusters[index].token,
                            "api": api,
                            "urlPeticionDetalleAcuerdoComercial": urlPeticionDetalleAcuerdoComercial,
                            "datosScript": controladorErrores.obtenerDatosScript(),
                            "etapa": "ejecutarTarea",
                            "estado": "000",
                            "tokenProceso": "", 
                            "resultado": "",
                        }
                        if (!respuestaDetalleAcuerdoComercial.hasOwnProperty("payingCompany") ) {
                            respuestaDetalleAcuerdoComercial.proceso.estado = "002" 
                            respuestaDetalleAcuerdoComercial.proceso.resultado = "Acuerdo comercial sin payingCompany"
                        } 
    
                        log.debug("ejecutarTarea - respuestaDetalleAcuerdoComercial", respuestaDetalleAcuerdoComercial)
                        acuerdosComercialesConDetalle.push(respuestaDetalleAcuerdoComercial)
    
                    });
    
                    clusters[index].proceso.acuerdosComercialesConDetalle = acuerdosComercialesConDetalle
    
                    // Declarar array que almacenara cada acuerdo comercial agrupado con su razon social 
                    var acuerdosComercialesConRazonesSociales = []
    
                    clusters[index].proceso.acuerdosComercialesConDetalle.forEach(function (acuerdoComercialConDetalle) {
                        if (acuerdoComercialConDetalle.hasOwnProperty("payingCompany") && acuerdoComercialConDetalle.proceso.estado === "000") {
                            // Definir api y url a usar para la peticion que recupera la razon social 
                            var api = "razonSocial"
                            var urlPeticionRazonSocial = clusters[index].urlBase + "m_razonSocial/" + acuerdoComercialConDetalle.payingCompany + "/"
        
                            // Ejecutar peticion para recuperar el detalle de cada acuerdo comercial
                            var respuestaRazonSocial = ejecutarPeticion(urlPeticionRazonSocial, acuerdoComercialConDetalle.proceso.tokenPeticion, api)
        
                            respuestaRazonSocial.proceso = {
                                "idCluster": clusters[index].id,
                                "tokenPeticion": clusters[index].token,
                                "api": api,
                                "urlPeticionRazonSocial": urlPeticionRazonSocial,
                                "datosScript": controladorErrores.obtenerDatosScript(),
                                "etapa": "ejecutarTarea",
                                "estado": "000",
                                "tokenProceso": "", 
                                "resultado": "",
                            }
                            if (!respuestaRazonSocial.hasOwnProperty("id")) {
                                respuestaRazonSocial.proceso.estado = "002" 
                                respuestaRazonSocial.proceso.resultado = "Razon social sin id" 
                            } 
                            
                            var objetoDatosParaCustomer = {
                                "acuerdoComercial": acuerdoComercialConDetalle,
                                "razonSocial": respuestaRazonSocial
                            }
    
                            acuerdosComercialesConRazonesSociales.push(objetoDatosParaCustomer)
    
                        } else {
                            // Crear reporte
                            // log.debug("ejecutarTarea - else - acuerdosComercialesConDetalle",acuerdosComercialesConDetalle)
                            // acuerdosComercialesConDetalle.proceso = daoCrearRegistros.crearReporteAuditoria(acuerdosComercialesConDetalle.proceso)
                        }
                    });

                    // Evaluar si existen acuerdos comerciales agrupados con su razon social
                    if (acuerdosComercialesConRazonesSociales.length > 0) {
                        // Crear customer
                        // var contadoracuerdosComercialesConRazonesSociales = 0
                        // acuerdosComercialesConRazonesSociales.forEach(function (acuerdoComercialConRazonSocial) {
                        //     if (acuerdoComercialConRazonSocial.hasOwnProperty("acuerdoComercial") & acuerdoComercialConRazonSocial.hasOwnProperty("razonSocial")) {
        
                        //         if (acuerdoComercialConRazonSocial.acuerdoComercial.proceso.estado === "000" & acuerdoComercialConRazonSocial.razonSocial.proceso.estado === "000") {
                        //             // Crear cliente
                        //             acuerdoComercialConRazonSocial = daoCrearRegistros.crearCliente(acuerdoComercialConRazonSocial)
                        //         } 

                        //         contadoracuerdosComercialesConRazonesSociales += 1
                                
                        //         // Crear reporte
                        //         // log.debug("ejecutarTarea - razonSocial",acuerdosComercialesConRazonesSociales[i].razonSocial)
                        //         // acuerdosComercialesConRazonesSociales[i].razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(acuerdosComercialesConRazonesSociales[i].razonSocial.proceso)
                        //         // log.debug("ejecutarTarea - razonSocial",acuerdosComercialesConRazonesSociales[i].razonSocial)
                        //     } 

                        // });
                        
                        for (var i = 0; i < 5; i++) {
                            if (acuerdosComercialesConRazonesSociales[i].hasOwnProperty("acuerdoComercial") && acuerdosComercialesConRazonesSociales[i].hasOwnProperty("razonSocial")) {
        
                                if (acuerdosComercialesConRazonesSociales[i].acuerdoComercial.proceso.estado === "000" && acuerdosComercialesConRazonesSociales[i].razonSocial.proceso.estado === "000") {
                                    // Validar existencia de customer en netsuite
                                    acuerdosComercialesConRazonesSociales[i].razonSocial.proceso.externalId = acuerdosComercialesConRazonesSociales[i].razonSocial.proceso.idCluster + "_" + acuerdosComercialesConRazonesSociales[i].razonSocial.id + "_" + acuerdosComercialesConRazonesSociales[i].acuerdoComercial.id
                                    var customerExistente = dao.busquedaCustomer(acuerdosComercialesConRazonesSociales[i].razonSocial.proceso.externalId)
                                    
                                    if (customerExistente.length > 0) {
                                        acuerdosComercialesConRazonesSociales[i].razonSocial.proceso.idCustomer = "ya existe registro custumer: " + customerExistente[0].internalId
                                        acuerdosComercialesConRazonesSociales[i].razonSocial.proceso.entityid = customerExistente[0].internalId
                                    } else {
                                        // Crear cliente
                                        acuerdosComercialesConRazonesSociales[i] = daoCrearRegistros.crearCliente(acuerdosComercialesConRazonesSociales[i])
                                    }

                                    // Crear cliente
                                    // acuerdosComercialesConRazonesSociales[i] = daoCrearRegistros.crearCliente(acuerdosComercialesConRazonesSociales[i])
        
                                } 
        
                                // Crear reporte
                                log.debug("ejecutarTarea - acuerdoComercial",acuerdosComercialesConRazonesSociales[i].acuerdoComercial)
                                log.debug("ejecutarTarea - razonSocial",acuerdosComercialesConRazonesSociales[i].razonSocial)
                                // acuerdosComercialesConRazonesSociales[i].razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(acuerdosComercialesConRazonesSociales[i].razonSocial.proceso)
                                // log.debug("ejecutarTarea - razonSocial",acuerdosComercialesConRazonesSociales[i].razonSocial)
                                
                            } 
                        }
                    }
    
                } else {
                    // Crear reporte
                    // log.debug("ejecutarTarea - else - cluster - " index,clusters[index])
                    // clusters[index].proceso = daoCrearRegistros.crearReporteAuditoria(clusters[index].proceso)
                }
                
            }

        } catch (error) {
            log.error("ejecutarTarea - error", error.message);
            // var proceso = {}

            // // Evaluar el nombre del error y crear reporte
            // if (error.name === "ERROR_PERSONALIZADO") {
            //     proceso.resultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
            //     daoCrearRegistros.crearReporteAuditoria(proceso)
            //     throw error
            // } else {
            //     proceso.resultado = error.message 
            //     daoCrearRegistros.crearReporteAuditoria(proceso)
            //     throw errorModule.create(controladorErrores.controladorErrores("001","ejecutarTarea",error.message))
            // } 
        }
    }

    return { execute : ejecutarTarea }
});