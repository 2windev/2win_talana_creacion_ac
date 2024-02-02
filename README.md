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
​
- Scripts

    1. [2win_sd_talana_creacion_ac.js](./2win_sd_talana_creacion_ac.js)

- Tablas Personalizadas
​
    1. [cluster talana](https://7583958-sb1.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=981)
    1. [2win auditoria](https://7583958-sb1.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=980)

- Tabla

    ​1. [customer](https://7583958-sb1.app.netsuite.com/app/common/entity/custjoblist.nl)

- Campos personalizados

    - Estos campos son utilizados en los registros de **customer**
        - custentity_tal_rz_pk
        - custentity_lmry_sv_taxpayer_number
        - custentity_lmry_digito_verificator
        - custentity_lmry_countrycode
        - custentity_lmry_nombre_empresa
        - custentity_lmry_giro_libre
        - custentity_tal_ca_pk
        - custentity_lmry_nomolestar
        - custentity_lmry_enimplementacion
        - custentity_2winestadoac
        - custentity_2winonhold
        - custentity_2winmotivoonhold
        - custentity_lmry_requiereoc
        - custentity_tal_commercialaggrdetails


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

- Documento test - metricas:

    - [Nombre documento test](Link a documento de test)
