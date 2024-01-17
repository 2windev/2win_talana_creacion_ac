/**
 * @NApiVersion 2.1
 * @module ./DAO_2win_iva_af_crear_registros.js
 * @NModuleScope Public
 */
define(["N/record","N/format","N/error","./DAO_controlador_errores.js"], function(record,format,errorModule,controladorErrores){

    /**.
    * @function crearCliente - Crear un nuevo cliente en la tabla customer.
    * @param {Object} datos - Datos para los campos del cliente a crear.
    * @return {String} - Internalid del cliente creado.
    */
    function crearCliente(datos) {
        try{
            log.debug("crearCliente - datos", {
                "datos": datos,
                "tipoDato": typeof(datos)
            })

            // Definir valores para campos del registro
            datos.razonSocial.proceso.etapa = "crearCliente"
            datos.razonSocial.proceso.custjob = datos.razonSocial.id + "/" + datos.acuerdoComercial.id
            datos.razonSocial.proceso.externalId = datos.razonSocial.proceso.idCluster + "_" + datos.razonSocial.id + "_" + datos.acuerdoComercial.id
            datos.razonSocial.proceso.digitoVerificador = datos.razonSocial.rut[datos.razonSocial.rut.length - 1]
            datos.razonSocial.proceso.taxPayerNumber = datos.razonSocial.rut.slice(0, -2);
            datos.acuerdoComercial.proceso.detalleAcuerdoComercial = `<p>Acuerdo comercial № ${datos.acuerdoComercial.id} <br>Razón social pagadora № ${datos.razonSocial.id} ${datos.razonSocial.rut} ${datos.razonSocial.razonSocial}<br></p><p> Plan Contratado: True </p><p>BillingCycle: ${datos.acuerdoComercial.billingCycle}</p><p> Notas: ${datos.acuerdoComercial.notes}</p><p>Plan Contratado: <pre>${datos.acuerdoComercial.hired_plan}</pre> </p>`
            datos.razonSocial.proceso.entityid = datos.razonSocial.id + "_" + datos.acuerdoComercial.id + "/" + datos.razonSocial.razonSocial
            datos.razonSocial.proceso.companyname = datos.razonSocial.id + "_" + datos.acuerdoComercial.id + "/" + datos.razonSocial.razonSocial
            datos.razonSocial.proceso.addressee = datos.razonSocial.id + "_" + datos.acuerdoComercial.id + "/" + datos.razonSocial.razonSocial

            log.debug("crearCliente - datos.razonSocial", datos.razonSocial)
            log.debug("crearCliente - datos.acuerdoComercial", datos.acuerdoComercial)

            // Crear registro
            var registro = record.create({ type : record.Type.CUSTOMER, isDynamic: true })

            // Definir campos registro
            registro.setValue({ fieldId: "entityid", value: datos.razonSocial.proceso.entityid });
            log.debug ("crearCliente - bodyFields","entityid");
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
            addressSubrecord.setValue({ fieldId: "phone", value: datos.razonSocial.telefono });
            log.debug("crearCliente - linea","campo - phone");
            lineaRegistro.commitLine({ sublistId: 'addressbook' });
            log.debug("crearCliente - lineaRegistro", "Se guardo linea addressbook");

            registro.setValue({ fieldId: "phone", value: datos.razonSocial.telefono });
            log.debug ("crearCliente - bodyFields","phone");
            /**@todo - Reemplazar valores estaticos */
            registro.setValue({ fieldId: "custentity_tal_ca_pk", value: datos.acuerdoComercial.id }); // datos.acuerdoComercial.id
            log.debug ("crearCliente - bodyFields","custentity_tal_ca_pk");
            registro.setValue({ fieldId: "email", value: datos.acuerdoComercial.emails }); // datos.razonSocial.logo
            log.debug ("crearCliente - bodyFields","email");
            log.debug ("crearCliente - datos.razonSocial.empresa_est",datos.razonSocial.empresa_est);
            registro.setValue({ fieldId: "comments", value: datos.acuerdoComercial.notes }); // datos.razonSocial.empresa_est
            log.debug ("crearCliente - bodyFields","comments");
            registro.setValue({ fieldId: "custentity_lmry_nomolestar", value: datos.acuerdoComercial.no_molestar });
            log.debug ("crearCliente - bodyFields","custentity_lmry_nomolestar");
            registro.setValue({ fieldId: "custentity_lmry_enimplementacion", value: datos.acuerdoComercial.en_implementacion });
            log.debug ("crearCliente - bodyFields","custentity_lmry_enimplementacion");
            registro.setValue({ fieldId: "custentity_2winestadoac", value: datos.acuerdoComercial.status }); 
            log.debug ("crearCliente - bodyFields","custentity_2winestadoac");
            registro.setValue({ fieldId: "custentity_2winonhold", value: datos.acuerdoComercial.on_hold });
            log.debug ("crearCliente - bodyFields","custentity_2winonhold");
            registro.setValue({ fieldId: "custentity_2winmotivoonhold", value: datos.acuerdoComercial.on_hold_reason });
            log.debug ("crearCliente - bodyFields","custentity_2winmotivoonhold");
            registro.setValue({ fieldId: "custentity_lmry_requiereoc", value: datos.acuerdoComercial.requires_oc });
            log.debug ("crearCliente - bodyFields","custentity_lmry_requiereoc");
            registro.setValue({ fieldId: "custentity_tal_commercialaggrdetails", value: datos.acuerdoComercial.proceso.detalleAcuerdoComercial });
            log.debug ("crearCliente - bodyFields","custentity_tal_commercialaggrdetails");

            // Guardar registro
            var idCliente = registro.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.audit("crearCliente - idCliente", idCliente)

            datos.razonSocial.proceso.idCliente = idCliente
            datos.razonSocial.proceso.resultado = "OK"
            datos.acuerdoComercial.proceso.idCliente = idCliente

            return datos
        }catch(error){
            log.error("crearCliente - error", error);
            datos.razonSocial.proceso.idCliente = ""
            datos.razonSocial.proceso.estado = "001"
            datos.razonSocial.proceso.resultado = error.message

            return datos
        }
    }
    
    return {
        crearCliente: crearCliente
    }
});