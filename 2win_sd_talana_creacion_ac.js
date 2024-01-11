/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/runtime","N/http","N/error", "./libs_talana_creacion_ac/DAO_controlador_errores.js"], function(runtime,http,errorModule,controladorErrores){

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
            log.audit("ejecutarPeticion - url", {
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

            // Realizar peticion get
            var respuesta = http.get({
                url: url,
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
                    "urlBase": "http://qa-internal.talana.dev/facturacion/api/",
                    "token": "61bfc7af41f5856a1d7e0d9533b83d0187a57e06",
                }
            ]

            // Recorrer cada cluster y sus datos
            for (var index = 0; index < clusters.length; index++) {
                clusters[index].proceso = proceso
                clusters[index].proceso.api = "acuerdosComerciales"
                clusters[index].proceso.urlPeticionAcuerdosComerciales = clusters[index].urlBase + "m_commercialAgreement/"
                clusters[index].proceso.tokenPeticion = clusters[index].token
                var acuerdosComerciales = []
                log.debug("ejecutarTarea - clusters[" + index + "].proceso", clusters[index].proceso)
                // ejecutar peticion para recuperar acuerdos comerciales
                var respuestaAcuerdosComerciales = ejecutarPeticion(clusters[index].proceso.urlPeticionAcuerdosComerciales, clusters[index].proceso.tokenPeticion, clusters[index].proceso.api)

                if (respuestaAcuerdosComerciales.results.length > 0) {
                    respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                        acuerdoComercial.proceso = clusters[index].proceso
                        log.debug("ejecutarTarea - acuerdoComercial", acuerdoComercial)
                        acuerdosComerciales.push(acuerdoComercial)
                    });

                    var contador = 0
                    /**@todo - Reemplazar: contador < 2 por respuestaAcuerdosComerciales.next !== null */
                    while (contador < 2) { // respuestaAcuerdosComerciales.next !== null
                        clusters[index].proceso.urlPeticionAcuerdosComerciales = respuestaAcuerdosComerciales.next
                        // ejecutar peticion para recuperar siguiente paginaacuerdos comerciales
                        respuestaAcuerdosComerciales = ejecutarPeticion(clusters[index].proceso.urlPeticionAcuerdosComerciales, clusters[index].proceso.tokenPeticion, clusters[index].proceso.api)

                        if (respuestaAcuerdosComerciales.results.length > 0) {
                            respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                                acuerdoComercial.proceso = clusters[index].proceso
                                log.debug("ejecutarTarea - while - acuerdoComercial", acuerdoComercial)
                                acuerdosComerciales.push(acuerdoComercial)
                            });
                        }

                        contador += 1
                    }
                }
                
                clusters[index].proceso.acuerdosComerciales = acuerdosComerciales
                log.debug("ejecutarTarea - acuerdosComerciales", clusters[index].proceso.acuerdosComerciales.length)

                var acuerdosComercialesConDetalle = []

                // Por cada acuerdo comercial
                clusters[index].proceso.acuerdosComerciales.forEach(function (acuerdoComercial) {
                    var api = "detalleAcuerdoComercial"
                    var urlPeticionDetalleAcuerdoComercial = clusters[index].urlBase + "m_commercialAgreement/" + acuerdoComercial.id + "/"

                    // Ejecutar peticion para recuperar el detalle de cada acuerdo comercial
                    var respuestaDetalleAcuerdoComercial = ejecutarPeticion(urlPeticionDetalleAcuerdoComercial, acuerdoComercial.proceso.tokenPeticion, api)

                    respuestaDetalleAcuerdoComercial.proceso = acuerdoComercial.proceso
                    respuestaDetalleAcuerdoComercial.proceso.api = api
                    respuestaDetalleAcuerdoComercial.proceso.urlPeticionDetalleAcuerdoComercial = urlPeticionDetalleAcuerdoComercial
                    if (respuestaDetalleAcuerdoComercial.hasOwnProperty("payingCompany") ) {
                        acuerdosComercialesConDetalle.push(respuestaDetalleAcuerdoComercial)
                    } else {
                        respuestaDetalleAcuerdoComercial.proceso.resultado = "Acuerdo comercial sin payingCompany" 
                        acuerdosComercialesConDetalle.push(respuestaDetalleAcuerdoComercial)
                    }

                });

                // for (var ind = 0; ind < clusters[index].proceso.acuerdosComerciales.length; ind++) {
                //     clusters[index].proceso.acuerdosComerciales[ind].proceso.api = "detalleAcuerdoComercial"
                //     clusters[index].proceso.acuerdosComerciales[ind].proceso.urlPeticionDetalleAcuerdoComercial = clusters[index].urlBase + "m_commercialAgreement/" + acuerdoComercial.id + "/"
                //     log.debug("ejecutarTarea - acuerdoComercial", acuerdoComercial)

                //     // Ejecutar peticion para recuperar el detalle de cada acuerdo comercial
                //     var respuestaDetalleAcuerdoComercial = ejecutarPeticion(acuerdoComercial.proceso.urlPeticionDetalleAcuerdoComercial, acuerdoComercial.proceso.proceso.tokenPeticion, acuerdoComercial.proceso.api)

                //     if (respuestaDetalleAcuerdoComercial.hasOwnProperty("payingCompany") ) {
                //         respuestaDetalleAcuerdoComercial.proceso = acuerdoComercial.proceso
                //         acuerdosComercialesConDetalle.push(respuestaDetalleAcuerdoComercial)
                //     } else {
                //         respuestaDetalleAcuerdoComercial.proceso = acuerdoComercial.proceso
                //         respuestaDetalleAcuerdoComercial.proceso.resultado = "Acuerdo comercial sin payingCompany" 
                //         acuerdosComercialesConDetalle.push(respuestaDetalleAcuerdoComercial)
                //     }
                    
                // }

                clusters[index].proceso.acuerdosComercialesConDetalle = acuerdosComercialesConDetalle

                clusters[index].proceso.acuerdosComercialesConDetalle.forEach(function (acuerdoComercialConDetalle) {
                    log.debug("ejecutarTarea - acuerdoComercialConDetalle", acuerdoComercialConDetalle)
                });

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