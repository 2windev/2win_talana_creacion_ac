/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/task","N/error","N/runtime","./libs_talana_creacion_ac/DAO_controlador_errores.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_busquedas.js"], function(task,errorModule,runtime,controladorErrores,daoCrearRegistros,dao){

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
     * @function ejecutarTarea - Lanzar proceso en ejecucion de script. 
     */
    function ejecutarTarea () {
        try {
            var numeroEjecucion = JSON.parse(runtime.getCurrentScript().getParameter("custscript_sd_talana_creacion_ac_ejecuci"))
            log.debug("ejecutarTarea - numeroEjecucion", numeroEjecucion)
            
            if (!numeroEjecucion) {
                numeroEjecucion = 0
            }
            
            log.debug("ejecutarTarea - numeroEjecucion", numeroEjecucion)

            var tokenProceso = dao.obtenerToken();
            var datosScript = controladorErrores.obtenerDatosScript()

            proceso.datosScript = datosScript
            proceso.scriptId = datosScript.scriptId
            proceso.etapa = "ejecutarTarea"
            proceso.tokenProceso = String(tokenProceso)

            // Recuperar los cluster y sus datos
            var clusters = dao.busquedaClustersActivos()

            // Declarar variable que monitoreara el status de la tarea
            var statusTarea;

            /**@todo - Eliminar redefinicion de variable clusters */
            // clusters = [clusters[0]]

            if (numeroEjecucion < clusters.length) {
                
                // Agregar propiedad proceso a cluster
                clusters[numeroEjecucion].proceso = {
                    "nombreProceso": "talana_creacion_ac",
                    "nombreCluster": clusters[numeroEjecucion].nombre,
                    "idSubsidiaria": clusters[numeroEjecucion].idSubsidiaria,
                    "api": "acuerdosComerciales",
                    "urlPeticionAcuerdosComerciales": clusters[numeroEjecucion].urlBase + "m_commercialAgreement/",
                    "acuerdosComerciales": [],
                    "acuerdosComercialesConDetalle": [],
                    "payingCompanys": [],
                    "razonesSociales": [],
                    "agrupadosAcRs": [],
                    "numeroEjecucion": numeroEjecucion,
                    "numeroMaximoEjecuciones": clusters.length,
                    "datosScript": proceso.datosScript,
                    "scriptId": proceso.scriptId,
                    "etapa": "ejecutarTarea",
                    "estado": "000",
                    "tokenProceso": tokenProceso, 
                    "decripcionResultado": "",
                }
                log.debug("ejecutarTarea - cluster", clusters[numeroEjecucion])

                // Crear una nueva tarea para el script map reduce con datos recuperados
                var tarea = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: "customscript_2win_mr_talana_creacion_ac",  
                    deploymentId: "customdeploy_2win_mr_talana_creacion_ac",
                    params: {
                        "custscript_mr_talana_creacion_ac_cluster": clusters[numeroEjecucion]
                    }
                });

                log.audit("ejecutarTarea - tarea",  tarea)
                log.audit("ejecutarTarea - proceso", proceso)
    
                // Enviar tarea
                var tareaId = tarea.submit();
                log.debug("ejecutarTarea - tareaId", tareaId)
    
                // Monitoreo tarea
                statusTarea = task.checkStatus({ taskId: tareaId });
                log.audit("ejecutarTarea - statusTarea", statusTarea);
            }

        } catch (error) {
            log.error("ejecutarTarea - error", error);

            // Evaluar el nombre del error y crear reporte
            if (error.name === "ERROR_PERSONALIZADO") {
                proceso.etapa = error.cause.message.etapa
                proceso.estado = error.cause.message.code_error
                proceso.decripcionResultado = error.cause.message.code_desc + " " + error.cause.message.data.error 
                daoCrearRegistros.crearReporteAuditoria(proceso)
                throw error
            } else {
                proceso.etapa = "ejecutarTarea" 
                proceso.estado = "001"
                proceso.decripcionResultado = error.message 
                daoCrearRegistros.crearReporteAuditoria(proceso)
                throw errorModule.create(controladorErrores.controladorErrores("001","ejecutarTarea",error.message))
            } 
        }
    }
    return { execute : ejecutarTarea }
});