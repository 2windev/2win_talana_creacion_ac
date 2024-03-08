# 2win_talana_creacion_ac - Bundle 2win_talana_creacion_ac (id de bundle)
​
Descripcion de proyecto
​
- Funcionalidades
​
    1. Ejecutar peticion a cada una de las paginas del endpoint m_commercialAgreement.
    2. Por cada acuerdo comercial recuperado ejecutar peticion al endpoint m_commercialAgreement/id/ pasando como parametro el id del acurdo comercial para recuperar el detalle de cada acuerdo comercial.
    3. Por cada detalle de acuerdo comercial recuperado ejecutar peticion al endponit m_razonSocial/id/ pasando como parametro la payingCompany del detalle del acuerdo comercial para recuperar la razon social asociada a este.
    4. Usando los datos del acuerdo comercial y su razon social crear registro de customer en netsuite
    5. Se crea un registro de contacto por cada uno de los email asociados al acuerdo comercial
    6. Se crea registro personalizado Automatic set
​
- Scripts

    1. [2win_sd_talana_creacion_ac.js](./2win_sd_talana_creacion_ac.js)
    2. [2win_mr_talana_creacion_ac.js](./2win_mr_talana_creacion_ac.js)

- Tablas Personalizadas
​
    1. [cluster talana](https://7583958-sb1.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=981)
    2. [2win auditoria](https://7583958-sb1.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=980)
    3. [Automatic set](https://7583958-sb1.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=360)

- Tabla

    ​1. [customer](https://7583958-sb1.app.netsuite.com/app/common/entity/custjoblist.nl)
    ​2. [contact](https://7583958-sb1.app.netsuite.com/app/common/entity/contactlist.nl)

- Campos personalizados

    - Estos campos son utilizados en los registros de **customer**
        - Nombre: RAZONSOCIAL PK 
        - Id: custentity_tal_rz_pk

        - Nombre: LATAM - NRO DE REGISTRO DE CONTRIBUYENTE
        - Id: custentity_lmry_sv_taxpayer_number

        - Nombre: LATAM - DIGITO VERIFICADOR
        - Id: custentity_lmry_digito_verificator

        - Nombre: LATAM - NOMBRE DE EMPRESA
        - Id: custentity_lmry_nombre_empresa

        - Nombre: LATAM - GIRO
        - Id: custentity_lmry_giro_libre

        - Nombre: ACUERDO COMERCIAL PK
        - Id: custentity_tal_ca_pk

        - Nombre: NO MOLESTAR
        - Id: custentity_lmry_nomolestar

        - Nombre: EN IMPLEMENTACIÓN
        - Id: custentity_lmry_enimplementacion

        - Nombre: ESTADO AC
        - Id: custentity_2winestadoacuerdo

        - Nombre: ON HOLD
        - Id: custentity_2winonhold

        - Nombre: MOTIVO ON HOLD
        - Id: custentity_2winmotivoonhold

        - Nombre: REQUIERE OC
        - Id: custentity_lmry_requiereoc

        - Nombre: DETALLE ACUERDO COMERCIAL
        - Id: custentity_tal_commercialaggrdetails

        - Nombre: BILLING CYCLE
        - Id: custentity_tal_billingcycle

        - Nombre: ESTADO DE COBRANZA
        - Id: custentity_2winestadocobranza

        - Nombre: LATAM ENTIDAD - PAIS DE LA SUBSIDIARIA
        - Id: custentity_lmry_subsidiary_country

        - Nombre: LATAM - PAÍS DE LA ENTIDAD
        - Id: custentity_lmry_country


- Librerías
​
    - [DAO_2win_talana_creacion_ac.js](./libs_talana_creacion_ac//DAO_2win_talana_creacion_ac.js)
        - Descripcion
            - Contiene funciones para buscar en tablas especificas de netsuite.
    - [DAO_2win_talana_creacion_ac_crear_registros.js](./libs_talana_creacion_ac/DAO_2win_talana_creacion_ac_crear_registros.js)
        - Descripcion
            - Contiene funciones para crear registros en las tablas **customer**.
    - [DAO_controlador_errores.js](./libs_talana_creacion_ac/DAO_controlador_errores.js)
        - Descripcion
            - Contiene funciones para determinar la estructura de un error y recuperar datos del script en ejecucion.