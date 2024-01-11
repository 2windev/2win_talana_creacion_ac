/**
 * @NApiVersion 2.x
 * @module ./DAO_controlador_errores.js
 * @NModuleScope Public
 */
define(["N/runtime", "N/email",'N/record', 'N/error'], function(runtime, email, record, errorModule){

    /**
     * @function controladorErrores - Controlar retornos de error para funciones
     * @param {String} code_error - Codigo ded error
     * @param {String} code_desc - Descripcion del error
     * @param {String} error - Mensaje de error
     * @returns {Object|Error} - Objeto de error o menaje de error
     */
    function controladorErrores(code_error,code_desc,error) {
        try {
            var objetoError = {
                "name": "ERROR_PERSONALIZADO",
                "message": {
                    "code_error": code_error, 
                    "code_desc": "Error " + code_desc, 
                    "etapa": code_desc,
                    "data": {
                        "error": error
                    }
                }
            }
            log.audit("controladorErrores - objetoError",objetoError)
            return objetoError
        } catch (error) {
            log.error("controladorErrores - error", error.message)
            if (error.name === 'ERROR_PERSONALIZADO') {
                throw error
            } else {
                throw errorModule.create({
                    "name": "ERROR_PERSONALIZADO",
                    "message": {
                        "code_error": "003", 
                        "code_desc": "Error controladorErrores", 
                        "data": {
                            "error": error.message
                        }
                    }
                });
            }
        }
    }

    /**
     * @function obtenerDatosScript - Obtener informacion general del script actual
     * @returns {{"userid": String, "useremail": String, "cuenta": String, "ambiente": String, "scriptId": String, "contexto": String }} - datos
     */
    function obtenerDatosScript () {
        try {
            var datosScr = {
                "userId": runtime.getCurrentUser().id,
                "userEmail": runtime.getCurrentUser().email,
                "scriptId": runtime.getCurrentScript().id,
                "cuenta": runtime.accountId,
                "ambiente": runtime.envType,
                "contexto": runtime.executionContext
            }
            log.audit("obtenerDatosScript - datosScr", datosScr)
            return datosScr
        } catch (error) {
            log.error("obtenerDatosScript - error", error.message)
            if (error.name === 'ERROR_PERSONALIZADO') {
                throw error
            } else {
                throw errorModule.create(controladorErrores("003","obtenerDatosScript",error.message))
            }
        }
    } 

    return {
        controladorErrores: controladorErrores,
        obtenerDatosScript: obtenerDatosScript
    }
});
