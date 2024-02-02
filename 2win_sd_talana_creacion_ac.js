/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @author Sebastian Alayon <sebastian.alayon@2win.cl>
 */
define(["N/task","N/error","./libs_talana_creacion_ac/DAO_controlador_errores.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js","./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_busquedas.js"], function(task,errorModule,controladorErrores,daoCrearRegistros,dao){

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
     * @function espera - Función que se ejecuta durante un perido de tiempo en milisegundos determinado 
     * @param {number} milisegundos - Milisegundos de espera
     */
    function espera(milisegundos) {
        // Tiempo en milisegundos
        var inicio = new Date().getTime();

        // Mientras el tiempo en milisegundos sea menor al el inicio mas los milisegundos indicados 
        while (new Date().getTime() < inicio + milisegundos);
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
            proceso.tokenProceso = String(tokenProceso)

            // Recuperar los cluster y sus datos
            var clusters = dao.busquedaClustersActivos()

            // Declarar variable que monitoreara el status de la tarea
            var statusTarea;
            var tareasIds = []
            var tareasStatus = []

            // Por cada regsitro de cluster activo recuperado
            clusters.forEach(function (cluster) {
                // Agregar propiedad proceso a cluster
                cluster.proceso = {
                    "nombreProceso": "talana_creacion_ac",
                    "nombreCluster": cluster.nombre,
                    "idSubsidiaria": cluster.idSubsidiaria,
                    "api": "acuerdosComerciales",
                    "urlPeticionAcuerdosComerciales": cluster.urlBase + "m_commercialAgreement/",
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

                log.debug("ejecutarTarea - cluster", cluster)

                // Crear una nueva tarea para el script map reduce con datos recuperados
                var tarea = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: "customscript_2win_mr_talana_creacion_ac",  
                    deploymentId: "customdeploy_2win_mr_talana_creacion_ac",
                    params: {
                        "custscript_mr_talana_creacion_ac_cluster": cluster
                    }
                });

                log.audit("ejecutarTarea - tarea",  tarea)
                log.audit("ejecutarTarea - proceso", proceso)
    
                // Enviar tarea
                var tareaId = tarea.submit();
                tareasIds.push(tareaId)
                log.debug("ejecutarTarea - tareaId", tareaId)
    
                // Monitoreo tarea
                statusTarea = task.checkStatus({ taskId: tareaId });
                log.audit("ejecutarTarea - statusTarea", statusTarea);

                // Ciclo para monitorear status tarea durante un tiempo en especifico
                var tiempoTranscurrido = 0;
                while (statusTarea.status !== "COMPLETE"  && statusTarea.status !== "CANCELLED" && statusTarea.status !== "FAILED" ) {
                    espera(5000);
                    tiempoTranscurrido += 5000;

                    // Volver a verificar el estado de la tarea Map/Reduce
                    statusTarea = task.checkStatus({
                        taskId: tareaId
                    });

                    log.audit("ejecutarTarea - while statusTarea", statusTarea);
                }

                if (statusTarea.status === "COMPLETE") {
                    log.audit("ejecutarTarea - statusTarea - COMPLETE", statusTarea);
                    tareasStatus.push(statusTarea)
                } else {
                    log.audit("ejecutarTarea - statusTarea", statusTarea);
                    throw errorModule.create(controladorErrores.controladorErrores("001","ejecutarTarea","Error ejecucion tarea para cluster: " + cluster.nombre + " - " + statusTarea))
                }
            });

            log.debug("ejecutarTarea - tareasIds", tareasIds)
            log.debug("ejecutarTarea - tareasStatus", tareasStatus)
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