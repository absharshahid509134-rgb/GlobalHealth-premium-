import type { UI } from './index';

const es: UI = {
  site: {
    name: 'GlobalHealth',
    tagline: 'Información de salud fiable para todos, en todas partes.',
    description:
      'GlobalHealth reúne conocimiento médico revisado por profesionales, medicamentos, diagnóstico, directorios de atención y un asistente de salud con IA en una plataforma rápida y accesible para todo el mundo.',
  },

  nav: {
    home: 'Inicio',
    platform: 'Plataforma',
    solutions: 'Soluciones',
    global: 'Global',
    about: 'Nosotros',
    contact: 'Contacto',
    menu: 'Menú',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    search: 'Buscar',
    searchPlaceholder: 'Buscar en GlobalHealth…',
    searchHint: 'Pulsa',
    searchKey: 'K',
    language: 'Idioma',
    appearance: 'Apariencia',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    themeSystem: 'Sistema',
    signIn: 'Iniciar sesión',
    getStarted: 'Empezar',
    emergency: 'Números de emergencia',
    sectionPrimary: 'Principal',
    sectionExplore: 'Explorar',
  },

  a11y: {
    skip: 'Saltar al contenido principal',
    mainNav: 'Navegación principal',
    footerNav: 'Navegación del pie de página',
    breadcrumb: 'Ruta de navegación',
    openSearch: 'Abrir búsqueda',
    closeSearch: 'Cerrar búsqueda',
    searchDialog: 'Buscar en GlobalHealth',
    searchHintText: 'Escribe para buscar. Usa las flechas para moverte y Enter para abrir.',
    resultsFor: 'Resultados para',
    noResults: 'Sin coincidencias',
    noResultsHint: 'Prueba con una palabra más corta o explora las páginas de la plataforma.',
    clearSearch: 'Borrar búsqueda',
    themeSwitch: 'Cambiar el tema de color',
    languageSwitch: 'Cambiar de idioma',
    backToTop: 'Volver arriba',
    breadcrumbLabel: 'Estás aquí',
    loading: 'Cargando',
    close: 'Cerrar',
    expand: 'Expandir',
    collapse: 'Contraer',
    required: 'obligatorio',
    optional: 'opcional',
    sectionLabel: 'Sección',
    selectLanguage: 'Selecciona tu idioma',
    chooseLanguage: 'Elige tu idioma',
    languageHelp: 'GlobalHealth está disponible en los siguientes idiomas.',
    continueInEnglish: 'Continuar en inglés',
    redirectsIn: 'Te llevamos a',
    currentPage: 'Página actual',
  },

  common: {
    learnMore: 'Saber más',
    getStarted: 'Empezar',
    explore: 'Explorar',
    seeAll: 'Ver todo',
    viewDetails: 'Ver detalles',
    backHome: 'Volver al inicio',
    back: 'Volver',
    new: 'Nuevo',
    beta: 'Beta',
    free: 'Gratis',
    popular: 'Popular',
    recommended: 'Recomendado',
    next: 'Siguiente',
    previous: 'Anterior',
    close: 'Cerrar',
    cancel: 'Cancelar',
    submit: 'Enviar',
    search: 'Buscar',
    filter: 'Filtrar',
    clear: 'Limpiar',
    clearAll: 'Limpiar todo',
    apply: 'Aplicar',
    reset: 'Restablecer',
    results: 'resultados',
    noResults: 'Sin resultados',
    minutes: 'min',
    hours: 'h',
    readTime: 'de lectura',
    updated: 'Actualizado',
    lastReviewed: 'Última revisión',
    perMonth: '/mes',
    perYear: '/año',
    from: 'Desde',
    yes: 'Sí',
    no: 'No',
    copy: 'Copiar',
    copied: 'Copiado',
    step: 'Paso',
    of: 'de',
  },

  footer: {
    explore: 'Explorar',
    company: 'Empresa',
    legal: 'Legal',
    privacy: 'Privacidad',
    terms: 'Términos',
    rights: '© {year} GlobalHealth. Todos los derechos reservados.',
    disclaimer: 'GlobalHealth ofrece información educativa de salud. No sustituye el consejo médico profesional, el diagnóstico ni la atención de emergencia.',
    languageHeading: 'Idioma',
    status: 'Todos los sistemas operativos',
    builtWith: 'Creado para personas en más de 190 países.',
  },

  hero: {
    badge: 'Revisado por profesionales · Disponible en todo el mundo',
    title: 'Todo lo que necesitas para entender tu salud,',
    titleAccent: 'en un solo lugar claro.',
    lead:
      'GlobalHealth convierte la información médica dispersa en orientación clara y estructurada: explicaciones de síntomas, fichas de medicamentos, preparación para análisis, directorios de atención verificados y un asistente de IA que responde en tu idioma.',
    primary: 'Explorar la plataforma',
    secondary: 'Hablar con el asistente de IA',
    note: 'Gratis · Sin cuenta para el contenido básico · Funciona en cualquier dispositivo',
    searchLabel: 'Busca temas de salud, medicamentos, análisis y síntomas',
    searchPlaceholder: 'Busca «diabetes», «paracetamol», «hemograma completo»…',
    popular: 'Búsquedas populares',
    suggestions: [
      'Diabetes',
      'Paracetamol',
      'Hemograma completo',
      'Hipertensión',
      'Migraña',
      'Hospital más cercano',
    ],
    trustLine: 'Usado por personas y profesionales sanitarios en más de 190 países',
  },

  stats: {
    label: 'GlobalHealth de un vistazo',
    items: [
      { value: '190+', label: 'Países y territorios alcanzados' },
      { value: '12.000+', label: 'Temas de salud revisados por profesionales' },
      { value: '8', label: 'Idiomas de interfaz, incluido el de derecha a izquierda' },
      { value: '< 1 s', label: 'Tiempo mediano hasta la interacción' },
    ],
  },

  trustBar: {
    label: 'Nuestros compromisos',
    items: [
      'Revisado por profesionales clínicos',
      'Redacción en lenguaje claro',
      'Sin publicidad en temas de salud',
      'Orientación a emergencias siempre primero',
    ],
  },

  home: {
    quickActions: {
      eyebrow: 'Acceso rápido',
      title: '¿Qué necesitas hoy?',
      lead: 'Seis accesos directos a las tareas más habituales.',
      items: [
        { title: 'Comprobar un síntoma', desc: 'Entiende qué puede significar un síntoma y cuándo buscar atención.' },
        { title: 'Buscar un medicamento', desc: 'Usos, dosis, interacciones, avisos y perfil de seguridad.' },
        { title: 'Prepararte para un análisis', desc: 'Ayuno, preparación y cómo se interpretan los resultados.' },
        { title: 'Buscar atención cercana', desc: 'Hospitales, clínicas, farmacias y urgencias en tu zona.' },
        { title: 'Preguntar al asistente de IA', desc: 'Obtén una respuesta explicada y con fuentes, en tu idioma.' },
        { title: 'Leer noticias de salud', desc: 'Información verificada sobre política, brotes e investigación.' },
      ],
    },

    modules: {
      eyebrow: 'La plataforma',
      title: 'Seis módulos conectados, una sola experiencia',
      lead:
        'Cada módulo sirve por sí solo. Juntos eliminan el cambio de pestaña, las suposiciones y la repetición que agotan a la hora de buscar información sanitaria.',
      items: [
        {
          tag: 'Conocimiento',
          title: 'Biblioteca de salud',
          desc: 'Guías de enfermedades escritas para personas reales: síntomas, causas, diagnóstico, tratamiento, autocuidado y señales de alarma.',
        },
        {
          tag: 'Medicamentos',
          title: 'Fichas de medicamentos',
          desc: 'Nombre genérico y comercial, concentraciones, formas farmacéuticas, interacciones, contraindicaciones y conservación, con revisión periódica.',
        },
        {
          tag: 'Diagnóstico',
          title: 'Centro de análisis',
          desc: 'Cada análisis habitual con preparación, tipo de muestra, plazo de entrega y una guía sencilla para entender las cifras.',
        },
        {
          tag: 'Directorio',
          title: 'Directorio de atención',
          desc: 'Hospitales, especialistas, clínicas, farmacias y urgencias, cartografiados y buscables por ubicación y especialidad.',
        },
        {
          tag: 'Inteligencia',
          title: 'Asistente de salud con IA',
          desc: 'Pregunta en cualquier idioma compatible. Las respuestas citan fuentes, declaran sus límites y nunca inventan un diagnóstico.',
        },
        {
          tag: 'Coordinación',
          title: 'Historial y coordinación',
          desc: 'Reúne citas, resultados, recetas y planes de cuidado, y compártelos con los profesionales que elijas.',
        },
      ],
    },

    how: {
      eyebrow: 'Cómo funciona',
      title: 'Tres pasos, sin suposiciones',
      lead: 'Diseñado en torno a una pregunta: ¿qué debería hacer una persona a continuación?',
      items: [
        {
          title: 'Describe lo que ocurre',
          desc: 'Escribe o habla. Empieza por un síntoma, un medicamento, un resultado o una pregunta con tus propias palabras.',
        },
        {
          title: 'Recibe una respuesta estructurada',
          desc: 'Secciones claras, citas y una declaración explícita de lo que se desconoce, más el punto en el que hace falta un profesional.',
        },
        {
          title: 'Actúa',
          desc: 'Reserva, guarda, imprime o comparte. Cada respuesta está pensada para terminar en una decisión.',
        },
      ],
    },

    features: {
      eyebrow: 'Hecho para el mundo real',
      title: 'Rápido, accesible y honesto por defecto',
      lead:
        'La mayoría del contenido sanitario en línea es lento, está lleno de anuncios y es difícil de leer. GlobalHealth está construido al revés.',
      items: [
        {
          title: 'Carga en menos de dos segundos',
          desc: 'Páginas estáticas, carga diferida, fuentes precargadas y ningún rastreador externo. Toda la estructura pesa unos pocos kilobytes.',
        },
        {
          title: 'De derecha a izquierda y ocho alfabetos',
          desc: 'El árabe se muestra de forma nativa en RTL. Latín, devanagari y CJK tienen tipografías y altura de línea ajustadas.',
        },
        {
          title: 'Completo con teclado y lector de pantalla',
          desc: 'Todos los controles son accesibles y están etiquetados, con paleta ⌘K, foco visible y soporte para movimiento reducido.',
        },
        {
          title: 'Números según tu región',
          desc: 'Fechas, dosis y cifras se formatean según tu región. Las calculadoras alternan entre métrico e imperial.',
        },
        {
          title: 'Orientación a emergencias primero',
          desc: 'Números de emergencia locales de cada país cubierto, a un toque, en todas las páginas.',
        },
        {
          title: 'Transparente sobre los límites',
          desc: 'Fuentes, fechas de revisión y confianza visibles. Cuando la evidencia es escasa, lo decimos en lugar de suponer.',
        },
      ],
    },

    standards: {
      eyebrow: 'Confianza y seguridad',
      title: 'La información sanitaria solo sirve si es de fiar',
      lead: 'Estos estándares se aplican en nuestro proceso editorial, no solo se enuncian en una política.',
      items: [
        {
          title: 'Revisión clínica',
          desc: 'Cada tema clínico lo revisa un profesional cualificado con nombre, especialidad y fecha de revisión registrados.',
        },
        {
          title: 'Fuentes trazables',
          desc: 'Las afirmaciones enlazan con la guía, el ensayo o el aviso del regulador del que proceden.',
        },
        {
          title: 'Independencia editorial',
          desc: 'Sin publicidad farmacéutica, sin contenido patrocinado en resultados y sin enlaces de afiliado en contenido clínico.',
        },
        {
          title: 'Límites visibles',
          desc: 'Cada página indica qué no cubre y cuándo conviene dejar de leer y contactar con un profesional.',
        },
      ],
      note:
        'GlobalHealth ofrece información de salud y herramientas de coordinación asistencial. No es un regulador sanitario, no diagnostica y no sustituye a un profesional habilitado ni a los servicios de urgencia.',
    },

    faq: {
      eyebrow: 'Preguntas',
      title: 'Todo lo que se pregunta antes de empezar',
      lead: '¿Sigues con dudas? Nuestro equipo responde en un día laborable.',
      items: [
        {
          q: '¿GlobalHealth sustituye a un médico?',
          a: 'No. Explicamos información sanitaria para que puedas mantener mejores conversaciones con un profesional. No diagnosticamos, no recetamos y no tratamos. Si puede haber peligro, contacta de inmediato con los servicios de urgencia de tu zona.',
        },
        {
          q: '¿Necesito una cuenta?',
          a: 'No. La biblioteca, las fichas de medicamentos, las guías de análisis, el directorio y el asistente de IA son abiertos. La cuenta solo hace falta para guardar historiales y coordinar la atención.',
        },
        {
          q: '¿Cómo se mantiene la exactitud?',
          a: 'Cada página clínica incluye revisor, especialidad y fecha. El contenido con revisión programada se marca antes de caducar y se degrada visiblemente hasta que alguien lo vuelve a aprobar.',
        },
        {
          q: '¿Qué idiomas admitís?',
          a: 'La interfaz completa se publica en ocho idiomas, incluido el árabe de derecha a izquierda. El asistente también puede responder en el idioma en el que escribas.',
        },
        {
          q: '¿Mis datos de salud están privados?',
          a: 'Leer contenido no requiere cuenta ni crea un perfil. Lo que decidas guardar es tuyo, exportable en cualquier momento, y nunca se vende ni se usa para publicidad.',
        },
        {
          q: '¿Cuánto cuesta?',
          a: 'La información esencial es gratuita, sin publicidad ni venta de datos. Los planes institucionales añaden gobernanza, registros de auditoría e integración.',
        },
      ],
    },

    cta: {
      title: 'Empieza por la pregunta que realmente tienes',
      lead: 'Sin registro, sin publicidad, sin venta de datos. Abre la plataforma y empieza.',
      primary: 'Explorar la plataforma',
      secondary: 'Hablar con el equipo',
      note: '¿Emergencia? Los números de emergencia locales están a un toque en todas las páginas.',
    },
  },

  globalTeaser: {
    eyebrow: 'Mundial',
    title: 'Diseñado para cómo funciona la sanidad en cada frontera',
    lead:
      'Una plataforma global tiene que respetar reglas, idiomas y realidades muy distintas. GlobalHealth se diseña así desde la primera línea de código.',
    items: [
      { region: 'Asia del Sur', countries: 'India, Bangladesh, Nepal, Sri Lanka', note: 'Contenido en idioma local, modo de bajo consumo' },
      { region: 'Europa y Reino Unido', countries: 'UE, EEE, Suiza, Reino Unido', note: 'Controles de residencia de datos conforme al RGPD' },
      { region: 'América', countries: 'EE. UU., Canadá, México, Brasil', note: 'Precios y formatos en USD/CAD/MXN/BRL' },
      { region: 'África y Oriente Medio', countries: 'Nigeria, Kenia, Sudáfrica, EAU, Arabia Saudí', note: 'Árabe RTL y alternativa por SMS con poca conexión' },
      { region: 'Asia-Pacífico', countries: 'China, Japón, Singapur, Australia, Indonesia', note: 'Tipografía CJK y sistema métrico por defecto' },
      { region: 'Resto del mundo', countries: 'Más de 190 países y territorios', note: 'Formato numérico, fechas y unidades según la configuración regional' },
    ],
    cta: 'Ver la cobertura global',
  },

  pages: {
    platform: {
      eyebrow: 'Plataforma',
      title: 'Un sistema para entender, decidir y actuar',
      lead:
        'GlobalHealth sustituye las once pestañas, los tres PDF y el buscador que la gente monta por su cuenta. Todos los módulos comparten identidad, historial y lenguaje visual.',
      heroPoints: [
        'Renderizado estático con mejora progresiva',
        'Un único sistema de componentes accesibles en todos los módulos',
        'Adaptación regional desde la primera petición, incluido RTL',
        'Citas y fechas de revisión en cada afirmación clínica',
      ],
      moduleHeading: 'Dentro de cada módulo',
      performance: {
        eyebrow: 'Ingeniería',
        title: 'La velocidad es una función clínica',
        lead: 'Una página que tarda seis segundos en aparecer es inusable para muchas personas y peligrosa para algunas. Estos son los números que nos exigimos.',
        items: [
          { label: 'LCP mediano en 4G', value: '< 1,2 s' },
          { label: 'Desplazamiento acumulado de diseño', value: '< 0,02' },
          { label: 'JavaScript en la primera vista', value: '< 20 kB' },
          { label: 'Rastreadores de terceros', value: '0' },
        ],
      },
      architecture: {
        eyebrow: 'Arquitectura',
        title: 'Cómo encaja todo',
        items: [
          {
            title: 'Estático por defecto',
            desc: 'Cada página pública se pre-renderiza en la compilación y se sirve desde el borde de una CDN. Sin ida y vuelta al servidor para leer información.',
          },
          {
            title: 'Islas, no una aplicaciónSPA',
            desc: 'Las piezas interactivas —búsqueda, calculadoras, formularios— se cargan como módulos pequeños solo donde se usan.',
          },
          {
            title: 'Preparado para sin conexión',
            desc: 'Un service worker guarda la experiencia de lectura, de modo que la guía esencial sigue funcionando con poca señal o durante un corte.',
          },
          {
            title: 'Base accesible',
            desc: 'Landmarks semánticos, gestión del foco, contraste por encima de WCAG 2.2 AA y operabilidad completa con teclado, comprobados en CI.',
          },
        ],
      },
      security: {
        eyebrow: 'Confianza',
        title: 'Privacidad y seguridad por defecto',
        items: [
          'Sin scripts de publicidad ni de perfilado en ninguna página de salud.',
          'Los historiales personales se cifran en tránsito y en reposo, y su propietario puede exportarlos.',
          'El consentimiento es explícito, revocable y queda registrado con fecha y hora.',
          'Las peticiones a terceros se limitan a fuentes autoalojadas y nuestra propia API.',
        ],
      },
    },

    solutions: {
      eyebrow: 'Soluciones',
      title: 'Una plataforma, cuatro formas de usarla',
      lead: 'Tanto si cuidas de tu salud como si diriges un servicio, GlobalHealth se adapta a tu trabajo.',
      personas: [
        {
          key: 'individuals',
          label: 'Para personas',
          title: 'Entiende tu salud sin suposiciones',
          desc: 'Busca un síntoma, un medicamento o un resultado y obtén una explicación estructurada y con fuentes; después da el siguiente paso con confianza.',
          points: [
            'Explicaciones de síntomas con señales de alarma claras',
            'Fichas de medicamentos con interacciones y avisos',
            'Preparación de análisis e interpretación de resultados',
            'Favoritos guardados, resúmenes imprimibles y recordatorios',
            'Asistente de IA en tu idioma, las 24 horas',
          ],
        },
        {
          key: 'clinicians',
          label: 'Para profesionales clínicos',
          title: 'Respuestas fiables en el punto de atención',
          desc: 'Reduce el tiempo perdido en búsquedas. Todo está revisado, fechado y citable, así que sirve en consulta y en documentación docente.',
          points: [
            'Búsqueda de texto completo en enfermedades, análisis y medicamentos',
            'Resúmenes para pacientes con las fuentes adjuntas',
            'Acceso sin conexión en salas con poca señal',
            'Material docente para equipos jóvenes y estudiantes',
            'Registro de auditoría de cada recurso compartido',
          ],
        },
        {
          key: 'hospitals',
          label: 'Para hospitales',
          title: 'Una capa común para todo el centro',
          desc: 'Una única fuente de información sanitaria para personal y pacientes, con la localización, gobernanza e informes que exige tu regulador.',
          points: [
            'Identidad institucional, SSO y acceso por roles',
            'Política de contenido personalizada y flujos de aprobación',
            'Informes de uso, calidad y equidad',
            'Opciones de alojamiento regional y residencia de datos',
            'Integración con los sistemas de historia clínica y portales',
          ],
        },
        {
          key: 'pharmacies',
          label: 'Para farmacias',
          title: 'Información de dispensación que la gente sí lee',
          desc: 'Ofrece una explicación clara y de marca de lo que se están tomando, en su idioma, en el momento de la entrega.',
          points: [
            'Páginas de monografía de marca con lenguaje para pacientes',
            'Avisos de interacción y de terapia duplicada',
            'Listas de asesoramiento y folletos imprimibles',
            'Información de stock, sustitución y suministro',
            'Incrustación de marca blanca en tu propio sitio',
          ],
        },
      ],
      cta: {
        title: '¿Necesitas algo concreto?',
        lead: 'Cuéntanos el flujo de trabajo que quieres mejorar y lo ajustamos a la plataforma.',
        primary: 'Hablar con el equipo',
        secondary: 'Leer sobre confianza',
      },
    },

    global: {
      eyebrow: 'Global',
      title: 'Una plataforma sanitaria que respeta dónde estás',
      lead:
        'La localización no es una fase de traducción. Dirección del texto, formatos numéricos y de fecha, unidades por defecto, marcos legales y rutas de urgencia forman parte del producto.',
      principles: {
        eyebrow: 'Principios',
        title: 'Qué significa «mundial» aquí',
        items: [
          {
            title: 'El RTL es nativo',
            desc: 'El árabe no es un añadido espejado. La interfaz usa propiedades lógicas, de modo que todo —incluidos la paleta y los gráficos— se refleja correctamente.',
          },
          {
            title: 'Tipografía según el alfabeto',
            desc: 'El texto latino usa una fuente geométrica ajustada, el árabe una Naskh dedicada, el devanagari su propia pila, y el CJK se apoya en fuentes del sistema en lugar de una descarga enorme.',
          },
          {
            title: 'Formatos locales en todas partes',
            desc: 'Fechas, horas, separadores decimales, números de teléfono y unidades siguen tu configuración regional, no la nuestra.',
          },
          {
            title: 'Preparado para poca conexión',
            desc: 'Un modo reducido quita imágenes y animaciones, y la orientación de emergencia se reduce a texto plano que funciona en cualquier sitio.',
          },
          {
            title: 'Marcos legales respetados',
            desc: 'Consentimiento, residencia y retención de datos según la región, con valores por defecto alineados con el RGPD en la UE y el EEE.',
          },
          {
            title: 'Rutas de emergencia locales',
            desc: 'De cualquier página, un toque hasta el número de emergencia correcto de tu país.',
          },
        ],
      },
      emergency: {
        eyebrow: 'Emergencias',
        title: 'El número que necesitas, ahora mismo',
        lead:
          'GlobalHealth no es un servicio de emergencias. Si alguien corre peligro inmediato, llama al número de tu país o al número local de emergencias.',
        searchLabel: 'Busca un país',
        searchPlaceholder: 'Busca por nombre de país…',
        empty: 'Ningún país coincide con esa búsqueda.',
        showAll: 'Mostrar todos los países',
        tableNumber: 'Número de emergencia',
        tableRegion: 'Región',
        copied: 'Número copiado',
        callNow: 'Llamar',
        general: 'Emergencia general',
        note: 'Los números se mantienen con las autoridades nacionales. Si alguno parece incorrecto en tu país, dínoslo para corregirlo.',
        report: 'Informar de un número incorrecto',
      },
      regions: {
        eyebrow: 'Cobertura',
        title: 'Dónde está activo GlobalHealth',
        items: [
          { region: 'Asia del Sur', countries: 'India, Bangladesh, Nepal, Sri Lanka', note: 'Contenido en idioma local, modo de bajo consumo' },
          { region: 'Europa y Reino Unido', countries: 'UE, EEE, Suiza, Reino Unido', note: 'Controles de residencia de datos conforme al RGPD' },
          { region: 'América', countries: 'EE. UU., Canadá, México, Brasil', note: 'Precios y formatos en USD/CAD/MXN/BRL' },
          { region: 'África y Oriente Medio', countries: 'Nigeria, Kenia, Sudáfrica, EAU, Arabia Saudí', note: 'Árabe RTL y alternativa por SMS con poca conexión' },
          { region: 'Asia-Pacífico', countries: 'China, Japón, Singapur, Australia, Indonesia', note: 'Tipografía CJK y sistema métrico por defecto' },
          { region: 'Resto del mundo', countries: 'Más de 190 países y territorios', note: 'Formato numérico, fechas y unidades según la configuración regional' },
        ],
      },
    },

    about: {
      eyebrow: 'Nosotros',
      title: 'Construimos información de salud sobre la que se puede actuar',
      lead:
        'GlobalHealth existe porque la distancia entre una guía publicada y la mesa de una persona todavía se mide en horas de búsqueda, y a menudo termina en un callejón sin salida.',
      mission: {
        eyebrow: 'Misión',
        title: 'Para qué existimos',
        items: [
          {
            title: 'Comprensión antes que volumen',
            desc: 'Doce mil páginas superficiales no ayudan a nadie. Publicamos menos temas y hacemos que cada uno sea realmente completo.',
          },
          {
            title: 'Claridad sin simplificar',
            desc: 'Conservamos el significado clínico y eliminamos la jerga, para que la persona pueda actuar sin diccionario.',
          },
          {
            title: 'Global desde la construcción',
            desc: 'Localización, accesibilidad y bajo consumo de datos son requisitos, no una fase final.',
          },
          {
            title: 'La honestidad como función',
            desc: 'Publicamos fechas de revisión, fuentes y nivel de confianza, y decimos con claridad cuando algo no se sabe.',
          },
        ],
      },
      story: {
        eyebrow: 'Nuestra historia',
        title: 'Cómo llegamos hasta aquí',
        paragraphs: [
          'GlobalHealth comenzó como una referencia interna para docentes clínicos cansados de explicar veinte veces las mismas preguntas. A través de ciclos de revisión y de la retroalimentación real de los lectores, creció hasta convertirse en una plataforma pública usada por personas que nunca la habían visto antes.',
          'Ese crecimiento cambió el encargo. Un recurso para profesionales y un recurso para un adolescente en una clínica rural no son el mismo producto, y fingir lo contrario es exactamente cómo la información sanitaria acaba engañando. La plataforma está construida para que un profesional encuentre profundidad y un lector novel encuentre claridad, en la misma página.',
          'Somos deliberadamente independientes. No hay publicidad, ni contenido patrocinado en resultados clínicos, ni venta de datos. Es una decisión comercial, pero también es la razón por la que los estándares editoriales significan algo.',
        ],
      },
      governance: {
        eyebrow: 'Gobernanza',
        title: 'Cómo se toman las decisiones',
        items: [
          { title: 'Independencia editorial', desc: 'El contenido clínico lo deciden clínicos y editores, nunca socios comerciales.' },
          { title: 'Responsabilidad nominal', desc: 'Cada página registra autor, revisor, especialidad y próxima fecha de revisión.' },
          { title: 'Correcciones abiertas', desc: 'Los errores se corrigen en su sitio con una nota de cambio visible. No borramos orientación en silencio.' },
          { title: 'Desafío independiente', desc: 'Un consejo clínico externo revisa los estándares cada trimestre y puede bloquear una publicación.' },
        ],
      },
      numbers: {
        eyebrow: 'Hoy',
        title: 'Dónde estamos',
        items: [
          { value: '12.000+', label: 'Temas revisados por profesionales' },
          { value: '190+', label: 'Países y territorios' },
          { value: '8', label: 'Idiomas de interfaz' },
          { value: '0', label: 'Anunciantes y revendedores de datos' },
        ],
      },
    },

    contact: {
      eyebrow: 'Contacto',
      title: 'Habla con una persona',
      lead:
        'Preguntas sobre el contenido, un número de emergencia incorrecto, una colaboración o una consulta de prensa: esto llega al equipo adecuado. Respondemos en un día laborable.',
      channels: [
        {
          title: 'Consultas generales',
          desc: 'Cualquier cosa que no encaje en otro canal.',
          value: 'hello@globalhealth.health',
          href: 'mailto:hello@globalhealth.health',
        },
        {
          title: 'Correcciones clínicas',
          desc: 'Informa de una inexactitud en una página clínica. Incluye la URL.',
          value: 'clinical@globalhealth.health',
          href: 'mailto:clinical@globalhealth.health',
        },
        {
          title: 'Colaboración e instituciones',
          desc: 'Hospitales, cadenas de farmacias, sistemas sanitarios y gobiernos.',
          value: 'partners@globalhealth.health',
          href: 'mailto:partners@globalhealth.health',
        },
        {
          title: 'Prensa y medios',
          desc: 'Consultas de prensa, entrevistas y recursos de marca.',
          value: 'press@globalhealth.health',
          href: 'mailto:press@globalhealth.health',
        },
      ],
      form: {
        title: 'Envíanos un mensaje',
        lead: 'Los campos obligatorios deben completarse. Solo usamos tus datos para responderte.',
        topic: 'Asunto',
        topicPlaceholder: 'Elige un asunto…',
        topics: ['Pregunta general', 'Corrección clínica', 'Colaboración', 'Consulta de prensa', 'Problema de accesibilidad', 'Otro'],
        name: 'Tu nombre',
        email: 'Correo electrónico',
        organisation: 'Organización',
        organisationPlaceholder: 'Opcional: hospital, universidad, medio',
        message: 'Mensaje',
        messagePlaceholder: 'Cuéntanos qué necesitas e incluye un enlace si va sobre contenido concreto.',
        consent: 'Acepto que GlobalHealth conserve estos datos para poder responderme.',
        submit: 'Enviar mensaje',
        sending: 'Enviando…',
        successTitle: 'Mensaje enviado',
        successBody: 'Gracias. Hemos recibido tu mensaje y responderemos en un día laborable.',
        sendAnother: 'Enviar otro mensaje',
        errorTitle: 'No hemos podido enviarlo',
        errorBody: 'Algo falló por nuestra parte. Inténtalo de nuevo o escríbenos directamente.',
        requiredField: 'Este campo es obligatorio.',
        invalidEmail: 'Introduce un correo electrónico válido.',
        tooShort: 'Añade un poco más de detalle para poder ayudarte.',
        consentRequired: 'Confirma que aceptas antes de responderte.',
        charCount: 'caracteres',
      },
      response: {
        title: 'Qué pasa después',
        items: [
          { title: 'En un día laborable', desc: 'Te responde una persona con nombre, no un autorespondedor.' },
          { title: 'En cinco días', desc: 'Las correcciones clínicas se verifican con un revisor y se corrigen o se explican.' },
          { title: 'Siempre', desc: 'Todo lo urgente sobre seguridad del paciente se escala el mismo día.' },
        ],
      },
      accessibility: {
        title: '¿Has encontrado una barrera de accesibilidad?',
        desc: 'Indícanos la página y lo que ocurrió. Tratamos los defectos de accesibilidad como errores de producción.',
        cta: 'Informar de una barrera',
      },
    },

    legal: {
      lastUpdated: 'Última actualización',
      languageNotice: 'Este documento se publica en inglés. A continuación se muestra un resumen traducido.',
      languageSummary: 'Resumen',
      privacySummary: 'No usamos publicidad ni seguimiento en las páginas de salud, nunca vendemos datos y todo lo que guardas es tuyo y exportable. La información de salud se cifra y puedes acceder, corregir o borrarla cuando quieras.',
    termsSummary: 'GlobalHealth ofrece información general de salud. No es consejo médico ni crea una relación médico–paciente. El contenido se puede citar con atribución; la reproducción masiva requiere permiso escrito.',
    contents: 'En esta página',
      backToTop: 'Volver arriba',
    },

    notFound: {
      code: '404',
      title: 'No hemos encontrado esa página',
      lead: 'Puede que el enlace esté desactualizado o que la página se haya movido. Aquí está la vía más rápida de vuelta.',
      primary: 'Ir a la página de inicio',
      secondary: 'Buscar en GlobalHealth',
      help: '¿Sigues atascado?',
      helpText: 'Cuéntanos qué buscabas y te llevaremos hasta allí.',
    },
  },
};

export default es;
