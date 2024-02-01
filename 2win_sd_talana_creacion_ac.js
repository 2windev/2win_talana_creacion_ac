/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/https","N/error","./libs_talana_creacion_ac/DAO_controlador_errores.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_busquedas.js"], function(https,errorModule,controladorErrores,daoCrearRegistros,dao){

    // Definir variable con datos del proceso
    var proceso = {
        "nombreProceso": "talana_creacion_ac",
        "datosScript": {},
        "etapa": "",
        "estado": "000",
        "tokenProceso": "", 
        "decripcionResultado": "",
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
            var tokenProceso = dao.obtenerToken();
            var datosScript = controladorErrores.obtenerDatosScript()

            proceso.datosScript = datosScript
            proceso.scriptId = datosScript.scriptId
            proceso.etapa = "ejecutarTarea"
            proceso.tokenProceso = tokenProceso

            // Recuperar los cluster y sus datos
            var clusters = dao.busquedaClustersActivos()

            // Recorrer cada cluster
            clusters.forEach(cluster => {
                // Agregar propiedad proceso a cluster
                cluster.proceso = {
                    "nombreProceso": "talana_creacion_ac",
                    "idCluster": cluster.id,
                    "idSubsidiaria": cluster.idSubsidiaria,
                    "api": "acuerdosComerciales",
                    "urlPeticionAcuerdosComerciales": cluster.urlBase + "m_commercialAgreement/",
                    "tokenPeticion": cluster.token,
                    "acuerdosComerciales": [],
                    "acuerdosComercialesConDetalle": [],
                    "payingCompanys": [],
                    "razonesSociales": [],
                    "agrupadosAcRs": [],
                    "datosScript": proceso.datosScript,
                    "scriptId": proceso.scriptId,
                    "etapa": "ejecutarTarea",
                    "estado": "000",
                    "tokenProceso": tokenProceso, 
                    "decripcionResultado": "",
                }

                // ejecutar peticion para recuperar acuerdos comerciales
                var respuestaAcuerdosComerciales = ejecutarPeticion(cluster.proceso.urlPeticionAcuerdosComerciales,cluster.token,cluster.proceso.api)

                // Array que almacenara los acuerdos comerciales recuperados
                var acuerdosComerciales = []

                // Evaluar si la propiedad results de la respuesta tiene elemetos
                if (respuestaAcuerdosComerciales.results.length > 0) {
                    // Por cada cada acuerdo comercial del array results
                    respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                        acuerdoComercial.proceso = cluster.proceso
                        log.debug("ejecutarTarea - acuerdoComercial", acuerdoComercial)

                        // Anadir cada acuerdo comercial al array que almacena los acuerdos comerciales del cluster
                        acuerdosComerciales.push(acuerdoComercial)
                    });

                    var contador = 0
                    /**@todo - Reemplazar: contador < 2 por respuestaAcuerdosComerciales.next !== null */
                    // Mientras existan mas paginas
                    while (contador < 3) { // respuestaAcuerdosComerciales.next !== null
                        cluster.proceso.urlPeticionAcuerdosComerciales = respuestaAcuerdosComerciales.next
                        // ejecutar peticion para recuperar siguiente paginaacuerdos comerciales
                        respuestaAcuerdosComerciales = ejecutarPeticion(cluster.proceso.urlPeticionAcuerdosComerciales,cluster.token,cluster.proceso.api)

                        // Evaluar si la propiedad results de la respuesta tiene elemetos
                        if (respuestaAcuerdosComerciales.results.length > 0) {
                            respuestaAcuerdosComerciales.results.forEach(function (acuerdoComercial) {
                                acuerdoComercial.proceso = cluster.proceso
                                log.debug("ejecutarTarea - while - if - acuerdoComercial", acuerdoComercial)

                                // Anadir cada acuerdo comercial de la pagina al array que almacena los acuerdos comerciales del cluster
                                acuerdosComerciales.push(acuerdoComercial)
                            });
                        } else {
                            log.error("ejecutarTarea - while - else - acuerdoComercial", acuerdoComercial)
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
                            "idCluster": cluster.id,
                            "idSubsidiaria": cluster.idSubsidiaria,
                            "tokenPeticion": cluster.token,
                            "api": api,
                            "urlPeticionDetalleAcuerdoComercial": urlPeticionDetalleAcuerdoComercial,
                            "datosScript": proceso.datosScript,
                            "scriptId": proceso.scriptId,
                            "etapa": "ejecutarTarea",
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
    
                        log.debug("ejecutarTarea - respuestaDetalleAcuerdoComercial", respuestaDetalleAcuerdoComercial)
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
                            "idCluster": cluster.id,
                            "idSubsidiaria": cluster.idSubsidiaria,
                            "api": api,
                            "urlPeticionRazonSocial": urlPeticionRazonSocial,
                            "tokenPeticion": cluster.token,
                            "datosScript": datosScript,
                            "scriptId": proceso.scriptId,
                            "etapa": "ejecutarTarea",
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
                                respuestaRazonSocial.proceso.externalId = cluster.id + "_" + respuestaRazonSocial.id + "_" + acuerdoComercialConDetalle.id
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

                    log.debug("ejecutarTarea - acuerdosComerciales", cluster.proceso.acuerdosComerciales.length)
                    log.debug("ejecutarTarea - payingCompanys", cluster.proceso.payingCompanys.length)
                    log.debug("ejecutarTarea - agrupadosAcRs", cluster.proceso.agrupadosAcRs.length)

                    // Evaluar si existen acuerdos comerciales agrupados con su razon social
                    if (cluster.proceso.agrupadosAcRs.length > 0) {
                        // Crear customer
                        // var contadorcluster.proceso.agrupadosAcRs = 0
                        // cluster.proceso.agrupadosAcRs.forEach(function (acuerdoComercialConRazonSocial) {
                        //     if (acuerdoComercialConRazonSocial.hasOwnProperty("acuerdoComercial") & acuerdoComercialConRazonSocial.hasOwnProperty("razonSocial")) {
        
                        //         if (acuerdoComercialConRazonSocial.acuerdoComercial.proceso.estado === "000" & acuerdoComercialConRazonSocial.razonSocial.proceso.estado === "000") {
                        //             // Crear cliente
                        //             acuerdoComercialConRazonSocial = daoCrearRegistros.crearCliente(acuerdoComercialConRazonSocial)
                        //         } 

                        //         contadorcluster.proceso.agrupadosAcRs += 1
                                
                        //         // Crear reporte
                        //         // log.debug("ejecutarTarea - razonSocial",cluster.proceso.agrupadosAcRs[i].razonSocial)
                        //         // cluster.proceso.agrupadosAcRs[i].razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(cluster.proceso.agrupadosAcRs[i].razonSocial.proceso)
                        //         // log.debug("ejecutarTarea - razonSocial",cluster.proceso.agrupadosAcRs[i].razonSocial)
                        //     } 

                        // });


                        // for (var index = 0; index < agrupadosAcRs.length; index++) {
                        //     log.debug("ejecutarTarea - acuerdoComercial", agrupadosAcRs[index].acuerdoComercial)
                        //     log.debug("ejecutarTarea - razonSocial", agrupadosAcRs[index].razonSocial)  
                        // }
                        
                        for (var i = 0; i < 15; i++) {
                            if (cluster.proceso.agrupadosAcRs[i].hasOwnProperty("acuerdoComercial") && cluster.proceso.agrupadosAcRs[i].hasOwnProperty("razonSocial")) {
        
                                if (cluster.proceso.agrupadosAcRs[i].acuerdoComercial.proceso.estado === "000" && cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.estado === "000") {
                                    cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.externalId = cluster.id + "_" + cluster.proceso.agrupadosAcRs[i].razonSocial.id + "_" + cluster.proceso.agrupadosAcRs[i].acuerdoComercial.id

                                    // Ejecutar busqueda para determinar si registro ya existe
                                    var customerExistente = dao.busquedaCustomer(cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.externalId)
                                    
                                    // Si el registro ya existe
                                    if (customerExistente.length > 0) {
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.tipoRegistroCreado = ""
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.idRegistroCreado = "ya existe registro custumer: " + customerExistente[0].internalId
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.entityid = customerExistente[0].internalId
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.decripcionResultado = "custumer ya existe"
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.estado = "001"
                                        /**@todo - Actualizar registro*/  
                                        // cluster.proceso.agrupadosAcRs[i] = daoCrearRegistros.actualizarCliente(cluster.proceso.agrupadosAcRs[i])
                                    } else {
                                        // Crear customer
                                        cluster.proceso.agrupadosAcRs[i] = daoCrearRegistros.crearCliente(cluster.proceso.agrupadosAcRs[i])
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.etapa = "crearReporteAuditoria"
                                        cluster.proceso.agrupadosAcRs[i].razonSocial.proceso.decripcionResultado = "OK"
                                    }
        
                                } 
        
                                // Crear reporte
                                log.debug("ejecutarTarea - acuerdoComercial",cluster.proceso.agrupadosAcRs[i].acuerdoComercial)
                                log.debug("ejecutarTarea - razonSocial",cluster.proceso.agrupadosAcRs[i].razonSocial)
                                cluster.proceso.agrupadosAcRs[i].razonSocial.proceso = daoCrearRegistros.crearReporteAuditoria(cluster.proceso.agrupadosAcRs[i].razonSocial.proceso)
                                log.debug("ejecutarTarea - razonSocial",cluster.proceso.agrupadosAcRs[i].razonSocial)
                                
                            } 
                        }
                    }
                } else {
                    // Crear reporte
                    cluster.proceso.etapa = "ejecutarPeticion"
                    cluster.proceso.estado = "002"
                    cluster.proceso.decripcionResultado = "Cluster sin acuerdos comerciales: " + JSON.stringify(respuestaAcuerdosComerciales)
                    cluster.proceso = daoCrearRegistros.crearReporteAuditoria(cluster.proceso)
                }

            });

        } catch (error) {
            log.error("ejecutarTarea - error", error.message);

            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                proceso.etapa = error.cause.message.etapa
                proceso.estado = error.cause.message.code_error
                proceso.decripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                daoCrearRegistros.crearReporteAuditoria(proceso)
                // throw error
            } else {
                proceso.etapa = "ejecutarTarea" 
                proceso.estado = "001"
                proceso.decripcionResultado = error.message 
                daoCrearRegistros.crearReporteAuditoria(proceso)
                // throw errorModule.create(controladorErrores.controladorErrores("001","ejecutarTarea",error.message))
            } 
        }
    }

    return { execute : ejecutarTarea }
});