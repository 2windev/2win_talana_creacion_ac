/**
 * @NApiVersion 2.1
 * @module ./DAO_2win_iva_af_crear_registros.js
 * @NModuleScope Public
 */
define(["N/record","N/error","./DAO_controlador_errores.js"], function(record,errorModule,controladorErrores){

    /**
     * @function crearReporteAuditoria - Crea un nuevo registro en base a los datos recibidos
     * @param {Object} datos - Datos necesarios para crear el registro
     * @returns {Number|Error} - id registro creado o mensaje de error
     */
    function crearReporteAuditoria(datos) {
        try {
            log.audit("crearReporteAuditoria - datos",{
                "datos": datos,
                "tipoDato": typeof(datos)
            })  
            
            // Crear el registro
            var crearRegistro = record.create({ type: "customrecord_2win_auditoria", isDynamic: true }); 

            // Definir Body fields
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_fecha", value: new Date() }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_fecha");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_proceso", value: datos.nombreProceso });
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_proceso");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_id_script", value: datos.scriptId  }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_id_script");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_tipo_registro", value: datos.tipoRegistroCreado }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_tipo_registro");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_registro_cread", value: datos.idRegistroCreado }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_registro_cread");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_etapa", value: datos.etapa }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_etapa");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_estado", value: datos.estado }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_estado");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_token", value: datos.tokenProceso }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_token");
            crearRegistro.setValue({ fieldId: "custrecord_2win_auditoria_descripcion", value: datos.descripcionResultado }); 
            log.debug("crearReporteAuditoria - bodyFields","custrecord_2win_auditoria_descripcion");

            // Guarda registro
            var guardarRegistro = crearRegistro.save({ enableSourcing: true});  
            log.audit("crearReporteAuditoria - guardarRegistro","Se guardo registro satisfactoriamente: " + guardarRegistro);

            datos.registroAuditoria = guardarRegistro

            return datos; 
        } catch (error) {
            log.error("crearReporteAuditoria - error", error)
            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001","crearReporteAuditoria",error.message))
            }
        }
    }

    /**
     * 
     * @param {String} rut  - String a formatear
     * @returns {String} - String formateado
     */
    function formatRut(rut) {
        try {
            log.debug("formatRut - rut", rut)

            var rutsinpuntos = rut.replace('.', '');
            return rutsinpuntos.toString().split(/(?=(?:\d{3})+(?:\.|$))/g).join(".");
        } catch (error) {
            log.error("formatRut - error", error)
            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001", "formatRut", error.message))
            }
        }
    }

    /**.
    * @function crearCliente - Crear un nuevo cliente en la tabla customer.
    * @param {Object} datos - Datos para los campos del cliente a crear.
    * @return {String} - Internalid del cliente creado.
    */
    function crearCliente(datos) {
        try {
            log.audit("crearCliente - datos", {
                "datos": datos,
                "tipoDato": typeof(datos)
            })

            // Definir valores para campos del registro
            datos.razonSocial.proceso.etapa = "crearCliente"
            datos.razonSocial.proceso.externalId = datos.razonSocial.proceso.nombreCluster + "_" + datos.razonSocial.id + "_" + datos.acuerdoComercial.id
            datos.razonSocial.proceso.entityid = datos.razonSocial.id + "_" + datos.acuerdoComercial.id + "/" + datos.razonSocial.razonSocial
            datos.razonSocial.proceso.taxPayerNumber = datos.razonSocial.rut.slice(0, -2);
            datos.razonSocial.proceso.companyname = datos.razonSocial.id + "_" + datos.acuerdoComercial.id + "/" + datos.razonSocial.razonSocial
            datos.razonSocial.proceso.digitoVerificador = datos.razonSocial.rut[datos.razonSocial.rut.length - 1]
            datos.razonSocial.proceso.addressee = datos.razonSocial.id + "_" + datos.acuerdoComercial.id + "/" + datos.razonSocial.razonSocial
            datos.acuerdoComercial.proceso.detalleAcuerdoComercial = `<p>Acuerdo comercial № ${datos.acuerdoComercial.id} <br>Razón social pagadora № ${datos.razonSocial.id} ${datos.razonSocial.rut} ${datos.razonSocial.razonSocial}<br></p><p> Plan Contratado: True </p><p>BillingCycle: ${datos.acuerdoComercial.billingCycle}</p><p> Notas: ${datos.acuerdoComercial.notes}</p><p>Plan Contratado: <pre>${datos.acuerdoComercial.hired_plan}</pre> </p>`
            
            // Verificar extension de valores para entityid y notes, si superan la extension se ajustan
            if (datos.razonSocial.proceso.entityid.length > 83) {
                datos.razonSocial.proceso.entityid = datos.razonSocial.proceso.entityid.substring(0, 83);
                datos.razonSocial.proceso.companyname = datos.razonSocial.proceso.companyname.substring(0, 83);
            }
            if (datos.acuerdoComercial.notes !== null && datos.acuerdoComercial.notes.length > 998) {
                datos.acuerdoComercial.notes = datos.acuerdoComercial.notes.substring(0, 998);
            } 

            // Crear registro
            var registro = record.create({ type : record.Type.CUSTOMER, isDynamic: true })

            // Definir campos registro
            registro.setValue({ fieldId: "entityid", value: datos.razonSocial.proceso.entityid });
            log.debug ("crearCliente - bodyFields","entityid");
            registro.setValue({ fieldId: "subsidiary", value: datos.razonSocial.proceso.idSubsidiaria });
            log.debug ("crearCliente - bodyFields","subsidiary");
            registro.setValue({ fieldId: "custentity_tal_rz_pk", value: datos.razonSocial.id });
            log.debug ("crearCliente - bodyFields","custentity_tal_rz_pk");
            registro.setValue({ fieldId: "custentity_lmry_sv_taxpayer_number", value: datos.razonSocial.proceso.taxPayerNumber });
            log.debug ("crearCliente - bodyFields","custentity_lmry_sv_taxpayer_number");
            registro.setValue({ fieldId: "companyname", value: datos.razonSocial.proceso.companyname });
            log.debug ("crearCliente - bodyFields","companyname");
            registro.setValue({ fieldId: "externalid", value: datos.razonSocial.proceso.externalId });
            log.debug ("crearCliente - bodyFields","externalid");
            registro.setValue({ fieldId: "custentity_lmry_digito_verificator", value: datos.razonSocial.proceso.digitoVerificador }); 
            log.debug ("crearCliente - bodyFields","custentity_lmry_digito_verificator");
            registro.setValue({ fieldId: "custentity_lmry_countrycode", value: datos.razonSocial.rut });
            log.debug ("crearCliente - bodyFields","custentity_lmry_countrycode");
            registro.setValue({ fieldId: "custentity_lmry_nombre_empresa", value: datos.razonSocial.razonSocial });
            log.debug ("crearCliente - bodyFields","custentity_lmry_nombre_empresa");
            registro.setValue({ fieldId: "custentity_lmry_giro_libre", value: datos.razonSocial.giro });
            log.debug ("crearCliente - bodyFields","custentity_lmry_giro_libre");

            // Linea para direccion
            var lineaRegistro = registro.selectNewLine({ sublistId: "addressbook" });
            log.debug("crearCliente - linea","addressbook");
            var addressSubrecord = lineaRegistro.getCurrentSublistSubrecord({ sublistId: "addressbook", fieldId: "addressbookaddress" });
            addressSubrecord.setValue({ fieldId: "addressee", value: datos.razonSocial.proceso.addressee });
            log.debug("crearCliente - linea","campo - addressee");
            addressSubrecord.setValue({ fieldId: "addr1", value: datos.razonSocial.direccion });
            log.debug("crearCliente - linea","campo - addr1");
            /**@todo - Consultar de donde provienen los datos para estos campos */
            // addressSubrecord.setValue({ fieldId: "addr2", value: "" });
            // log.debug("crearCliente - linea","campo - addr2");
            // addressSubrecord.setValue({ fieldId: "city", value: "" });
            // log.debug("crearCliente - linea","campo - city");
            // addressSubrecord.setValue({ fieldId: "state", value: datos.razonSocial.comuna });
            // log.debug("crearCliente - linea","campo - state");
            addressSubrecord.setValue({ fieldId: "country", value: "CL" });
            log.debug("crearCliente - linea","campo - country");

            // Definir campos de telefono solo si cumplen con la extension requerida
            if (datos.razonSocial.telefono !== null && datos.razonSocial.telefono.length >= 7) {
                addressSubrecord.setValue({ fieldId: "phone", value: datos.razonSocial.telefono });
                log.debug("crearCliente - linea","campo - phone");
                registro.setValue({ fieldId: "phone", value: datos.razonSocial.telefono });
                log.debug ("crearCliente - bodyFields","phone");
            }
            lineaRegistro.commitLine({ sublistId: 'addressbook' });
            log.debug("crearCliente - lineaRegistro", "Se guardo linea addressbook");
            
            registro.setValue({ fieldId: "custentity_tal_ca_pk", value: datos.acuerdoComercial.id }); 
            log.debug ("crearCliente - bodyFields","custentity_tal_ca_pk");
            if (datos.acuerdoComercial.hasOwnProperty("emails") && datos.acuerdoComercial.emails !== "" && datos.acuerdoComercial.emails !== null) {  
                datos.acuerdoComercial.proceso.emails = datos.acuerdoComercial.emails.split(/[;,]/);
                datos.acuerdoComercial.proceso.email = datos.acuerdoComercial.proceso.emails[0]
                registro.setValue({ fieldId: "email", value: datos.acuerdoComercial.proceso.email }); 
                log.debug ("crearCliente - bodyFields","email");
            }
            registro.setValue({ fieldId: "comments", value: datos.acuerdoComercial.notes }); 
            log.debug ("crearCliente - bodyFields","comments");
            registro.setValue({ fieldId: "custentity_lmry_nomolestar", value: datos.acuerdoComercial.no_molestar });
            log.debug ("crearCliente - bodyFields","custentity_lmry_nomolestar");
            registro.setValue({ fieldId: "custentity_lmry_enimplementacion", value: datos.acuerdoComercial.en_implementacion });
            log.debug ("crearCliente - bodyFields","custentity_lmry_enimplementacion");
            registro.setValue({ fieldId: "custentity_2winestadoacuerdo", value: datos.acuerdoComercial.status }); 
            log.debug ("crearCliente - bodyFields","custentity_2winestadoacuerdo");
            registro.setValue({ fieldId: "custentity_2winonhold", value: datos.acuerdoComercial.on_hold });
            log.debug ("crearCliente - bodyFields","custentity_2winonhold");
            registro.setValue({ fieldId: "custentity_2winmotivoonhold", value: datos.acuerdoComercial.on_hold_reason });
            log.debug ("crearCliente - bodyFields","custentity_2winmotivoonhold");
            registro.setValue({ fieldId: "custentity_lmry_requiereoc", value: datos.acuerdoComercial.requires_oc });
            log.debug ("crearCliente - bodyFields","custentity_lmry_requiereoc");
            registro.setValue({ fieldId: "custentity_tal_commercialaggrdetails", value: datos.acuerdoComercial.proceso.detalleAcuerdoComercial });
            log.debug ("crearCliente - bodyFields","custentity_tal_commercialaggrdetails");
            registro.setValue({ fieldId: "custentity_tal_billingcycle", value: datos.acuerdoComercial.billingCycle });
            log.debug("crearCliente - bodyFields", "custentity_tal_billingcycle");
            registro.setValue({ fieldId: "custentity_lmry_sv_taxpayer_number", value: formatRut(datos.razonSocial.proceso.taxPayerNumber) });
            log.debug("crearCliente - bodyFields", "custentity_lmry_sv_taxpayer_number");

            // Definir campos con valores estaticos
            registro.setValue({ fieldId: "terms", value: datos.acuerdoComercial.proceso.terms });
            log.debug("crearCliente - terms", datos.acuerdoComercial.proceso.terms);
            registro.setValue({ fieldId: "accountnumber", value: datos.acuerdoComercial.proceso.cuenta });
            log.debug("crearCliente - accountnumber", datos.acuerdoComercial.proceso.cuenta);
            registro.setValue({ fieldId: "taxitem", value: datos.acuerdoComercial.proceso.artImpto });
            log.debug("crearCliente - taxitem", datos.acuerdoComercial.proceso.artImpto);
            registro.setValue({ fieldId: "custentity_2winestadocobranza", value: datos.acuerdoComercial.proceso.estadocobranza });
            log.debug("crearCliente - custentity_2winestadocobranza", datos.acuerdoComercial.proceso.estadocobranza);
            registro.setValue({ fieldId: "custentity_lmry_subsidiary_country", value: datos.acuerdoComercial.proceso.lmry_subsidiary_country });
            log.debug("crearCliente - custentity_lmry_subsidiary_country", datos.acuerdoComercial.proceso.lmry_subsidiary_country);
            registro.setValue({ fieldId: "custentity_lmry_country", value: datos.acuerdoComercial.proceso.lmry_country });
            log.debug("crearCliente - bodyField", {"custentity_lmry_country": datos.acuerdoComercial.proceso.lmry_country});
            registro.setValue({ fieldId: "custentity_lmry_countrycode", value: datos.acuerdoComercial.proceso.lmry_countrycode });
            log.debug("crearCliente - bodyField", {"custentity_lmry_countrycode": datos.acuerdoComercial.proceso.lmry_countrycode});

            // Guardar registro
            var idCustomer = registro.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.audit("crearCliente - idCustomer", idCustomer);

            datos.razonSocial.proceso.tipoRegistroCreado = "customer"
            datos.razonSocial.proceso.idRegistroCreado = String(idCustomer)
            datos.acuerdoComercial.proceso.idCustomer = idCustomer

            return datos
        } catch (error){
            log.error("crearCliente - error", error);

            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001","crearCliente",error.message + " para acuerdo comercial: " + datos.acuerdoComercial.id))
            }
        }
    }
    
    /**
     * @function getContacto - Valida tipos de contacto en acuerdo comercial y crea contactos correspondientes
     * @param {object} datos - Datos de acurdo comercial y razon social
     * @returns 
     */
    function getContacto(datos) {
        try {
            datos.razonSocial.proceso.etapa = "getContacto"
            log.debug("getContacto - datos", datos);

            var emailList = [];
            datos.razonSocial.proceso.contactosCreados = [];

            // Si el acuerdo comercial tiene email
            if (datos.acuerdoComercial.hasOwnProperty("emails") && datos.acuerdoComercial.emails !== "" && datos.acuerdoComercial.emails !== null) {
                // Aislar cada email en el array emailList
                emailList = datos.acuerdoComercial.emails.split(/[;,]/);

                // Por cada email
                for (var i = 0; i < emailList.length; i++) {
                    datosContacto = {
                        "customerId": datos.acuerdoComercial.proceso.idCustomer,
                        "typeContact": 'email',
                        "firstName": 'Contacto', //datos.razonSocial.razonSocial,
                        "lastName": '',
                        "telephone": datos.razonSocial.telefono,
                        "email": emailList[i],
                        "subsidiary": datos.razonSocial.proceso.idSubsidiaria
                    }

                    // Crear contacto
                    datosContacto = crearContacto(datosContacto)
                    datos.razonSocial.proceso.contactosCreados.push(datosContacto)
                };
            }

            emailList = [];

            // Si el acuerdo comercial tiene administrative_contact
            if (datos.acuerdoComercial.hasOwnProperty("administrative_contact") && datos.acuerdoComercial.administrative_contact !== "" && datos.acuerdoComercial.administrative_contact !== null) {
                // Aislar cada administrative_contact en el array emailList
                emailList = datos.acuerdoComercial.administrative_contact.split(/[;,]/);

                // Por cada administrative_contact
                for (var i = 0; i < emailList.length; i++) {
                    datosContacto = {
                        "customerId": datos.acuerdoComercial.proceso.idCustomer,
                        "typeContact": 'Adm Contacto',
                        "firstName": 'Contato Administrativo', //datos.razonSocial.razonSocial,
                        "lastName": '',
                        "telephone": datos.razonSocial.telefono,
                        "email": emailList[i],
                        "subsidiary": datos.razonSocial.proceso.idSubsidiaria
                    }

                    // Crear contacto
                    datosContacto = crearContacto(datosContacto)
                    datos.razonSocial.proceso.contactosCreados.push(datosContacto)
                };
            }

            return datos
        } catch (error) {
            log.error("getContacto - error", error);
            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001", "getContacto", error.message + " para customer: " + customerId))
            }
        }
    }

    /**
     * @function crearContacto - Crear registro en netsuite
     * @param {object} datosContacto - Datos necesarios para crear el registro
     * @returns {object} - Datos con datos de registro creado
     */
    function crearContacto(datosContacto) {
        try {
            log.debug("crearContacto - datosContacto", datosContacto)

            var registro = null;
            var registro = record.create({ type: "contact", isDynamic: true });

            registro.setValue({ fieldId: "company", value: datosContacto.customerId })
            log.debug("crearContacto - company", datosContacto.customerId);
            registro.setValue({ fieldId: "name", value: datosContacto.typeContact })
            log.debug("crearContacto - name", datosContacto.typeContact);
            registro.setValue({ fieldId: "firstname", value: datosContacto.firstName })
            log.debug("crearContacto - firstname", datosContacto.firstName);
            registro.setValue({ fieldId: "lastname", value: datosContacto.lastName })
            log.debug("crearContacto - lastname", datosContacto.lastname);
            registro.setValue({ fieldId: "homephone", value: datosContacto.telephone })
            log.debug("crearContacto - homephone", datosContacto.telephone);
            registro.setValue({ fieldId: "email", value: datosContacto.email })
            log.debug("crearContacto - email", datosContacto.email);
            registro.setValue({ fieldId: "subsidiary", value: datosContacto.subsidiary })
            log.debug("crearContacto - subsidiary", datosContacto.subsidiary);

            var idContacto = registro.save({ ignoreMandatoryFields: true });
            datosContacto.idContacto = idContacto;
            log.audit("crearContacto - idContacto", idContacto)

            return datosContacto
        } catch (error) {
            log.error("crearContacto - error", error);
            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001", "crearContacto", error.message + " para customer: " + datosContacto.customerId))
            }
        }
    };

    /**
     * @function creaAutomaticSet - Crear un registro personalizado en netsuite
     * @param {object} datos - Datos necesarios para la creacion del registro
     * @returns {object} - Datos luego de la creacion del registro
     */
    function creaAutomaticSet(datos) {
        try {
            log.debug("creaAutomaticSet - lmry_automaticSet", datos.razonSocial.proceso.lmry_automaticSet)
            datos.razonSocial.proceso.etapa = "creaAutomaticSet"

            // Crear registro
            var registro = record.create({ type: 'customrecord_lmry_universal_setting_v2', isDynamic: true });

            // Definir campos registro
            registro.setValue({ fieldId: "custrecord_lmry_us_entity", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_us_entity });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_us_entity");
            registro.setValue({ fieldId: "custrecord_lmry_us_entity_type", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_us_entity_type });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_us_entity_type");
            registro.setValue({ fieldId: "custrecord_lmry_us_subsidiary", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_us_subsidiary });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_us_entity_type");
            registro.setValue({ fieldId: "custrecord_lmry_us_country", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_us_country });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_us_country");
            registro.setValue({ fieldId: "custrecord_lmry_us_transaction", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_us_transaction });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_us_transaction");
            registro.setValue({ fieldId: "custrecord_lmry_document_type", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_document_type });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_document_type");
            registro.setValue({ fieldId: "custrecord_lmry_paymentmethod", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_paymentmethod });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_paymentmethod");
            registro.setValue({ fieldId: "custrecord_lmry_doc_ref_type", value: datos.razonSocial.proceso.lmry_automaticSet.lmry_doc_ref_type });
            log.debug("creaAutomaticSet - bodyFields", "custrecord_lmry_doc_ref_type");

            // Guardar registro
            var idAutomaticSet = registro.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.audit("creaAutomaticSet - idAutomaticSet", idAutomaticSet)
            datos.razonSocial.proceso.idAutomaticSet = idAutomaticSet
            datos.razonSocial.proceso.descripcionResultado = "Acuerdo comercial: " + datos.acuerdoComercial.id + " procesado"

            return datos
        } catch (error) {
            log.error("creaAutomaticSet - error", error);
            if (error.name === "ERROR_PERSONALIZADO") {
                throw error
            } else {
                throw errorModule.create(controladorErrores.controladorErrores("001", "creaAutomaticSet", error.message + " para acuerdo comercial: " + datos.acuerdoComercial.id))
            }
        }
    };

    return {
        crearReporteAuditoria: crearReporteAuditoria,
        crearCliente: crearCliente,
        getContacto: getContacto,
        creaAutomaticSet: creaAutomaticSet
    }
});