import type { UI } from './index';

const zh: UI = {
  site: {
    name: 'GlobalHealth',
    tagline: '值得信赖的健康知识，人人可得，处处可用。',
    description:
      'GlobalHealth 将经临床医生审核的医学知识、药品、检验、就医名录与 AI 健康助手汇聚于一身，打造一个面向全球、快速且无障碍的平台。',
  },

  nav: {
    home: '首页',
    platform: '平台',
    solutions: '解决方案',
    global: '全球',
    about: '关于我们',
    contact: '联系我们',
    menu: '菜单',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    search: '搜索',
    searchPlaceholder: '在 GlobalHealth 中搜索…',
    searchHint: '按下',
    searchKey: 'K',
    language: '语言',
    appearance: '外观',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '跟随系统',
    signIn: '登录',
    getStarted: '开始使用',
    emergency: '急救电话',
    sectionPrimary: '主要',
    sectionExplore: '探索',
  },

  a11y: {
    skip: '跳到主要内容',
    mainNav: '主导航',
    footerNav: '页脚导航',
    breadcrumb: '面包屑导航',
    openSearch: '打开搜索',
    closeSearch: '关闭搜索',
    searchDialog: '在 GlobalHealth 中搜索',
    searchHintText: '输入即可搜索。使用方向键移动，回车打开。',
    resultsFor: '搜索结果',
    noResults: '没有匹配结果',
    noResultsHint: '试试更短的词，或浏览下方的平台页面。',
    clearSearch: '清除搜索',
    themeSwitch: '切换配色主题',
    languageSwitch: '切换语言',
    backToTop: '返回顶部',
    breadcrumbLabel: '您当前的位置',
    loading: '加载中',
    close: '关闭',
    expand: '展开',
    collapse: '收起',
    required: '必填',
    optional: '选填',
    sectionLabel: '章节',
    selectLanguage: '选择语言',
    chooseLanguage: '选择您的语言',
    languageHelp: 'GlobalHealth 提供以下语言版本。',
    continueInEnglish: '继续使用英文',
    redirectsIn: '正在跳转到',
    currentPage: '当前页面',
  },

  common: {
    learnMore: '了解更多',
    getStarted: '开始使用',
    explore: '探索',
    seeAll: '查看全部',
    viewDetails: '查看详情',
    backHome: '返回首页',
    back: '返回',
    new: '新',
    beta: '测试版',
    free: '免费',
    popular: '热门',
    recommended: '推荐',
    next: '下一步',
    previous: '上一步',
    close: '关闭',
    cancel: '取消',
    submit: '提交',
    search: '搜索',
    filter: '筛选',
    clear: '清除',
    clearAll: '全部清除',
    apply: '应用',
    reset: '重置',
    results: '条结果',
    noResults: '没有结果',
    minutes: '分钟',
    hours: '小时',
    readTime: '阅读',
    updated: '更新于',
    lastReviewed: '最近审核',
    perMonth: '/月',
    perYear: '/年',
    from: '起',
    yes: '是',
    no: '否',
    copy: '复制',
    copied: '已复制',
    step: '步骤',
    of: '/',
  },

  footer: {
    explore: '探索',
    company: '公司',
    legal: '法律',
    privacy: '隐私',
    terms: '条款',
    rights: '© {year} GlobalHealth. 保留所有权利。',
    disclaimer: 'GlobalHealth 提供的是健康科普信息，不能替代专业医疗建议、诊断或急救服务。',
    languageHeading: '语言',
    status: '所有系统运行正常',
    builtWith: '为 190 多个国家的人们而打造。',
  },

  hero: {
    badge: '临床医生审核 · 全球可用',
    title: '看懂自己的健康所需的一切，',
    titleAccent: '都在这一个清晰的地方。',
    lead:
      'GlobalHealth 把散落的医学信息整理成清晰、有条理的指引：症状解读、药品说明书、检验前准备、经核实的就医名录，以及一个用您自己的语言回答问题的 AI 助手。',
    primary: '探索平台',
    secondary: '与 AI 助手对话',
    note: '免费 · 核心内容无需注册 · 任何设备都能使用',
    searchLabel: '搜索健康主题、药品、检验和症状',
    searchPlaceholder: '搜索「糖尿病」「对乙酰氨基酚」「血常规」…',
    popular: '热门搜索',
    suggestions: [
      '糖尿病',
      '对乙酰氨基酚',
      '血常规',
      '高血压',
      '偏头痛',
      '最近的医院',
    ],
    trustLine: '全球 190 多个国家的普通人与医务人员正在使用',
  },

  stats: {
    label: 'GlobalHealth 概览',
    items: [
      { value: '190+', label: '覆盖的国家与地区' },
      { value: '12,000+', label: '经临床医生审核的健康主题' },
      { value: '8', label: '界面语言，含从右向左书写' },
      { value: '< 1 秒', label: '可交互时间中位数' },
    ],
  },

  trustBar: {
    label: '我们的承诺',
    items: [
      '临床医生审核',
      '通俗易懂的语言',
      '健康主题内不投放广告',
      '紧急情况优先指引',
    ],
  },

  home: {
    quickActions: {
      eyebrow: '快速入口',
      title: '今天您需要什么？',
      lead: '六条直达路径，覆盖最常见的健康需求。',
      items: [
        { title: '了解一个症状', desc: '看懂某个症状可能意味着什么，以及何时需要就医。' },
        { title: '查询一种药品', desc: '适应症、剂量、相互作用、警示与安全性信息。' },
        { title: '准备一项检查', desc: '空腹要求、检查前准备，以及如何解读结果。' },
        { title: '找到附近的医疗服务', desc: '所在区域的医院、诊所、药房与急诊。' },
        { title: '询问 AI 助手', desc: '用您的语言获得有出处的清晰解答。' },
        { title: '阅读健康资讯', desc: '经核实的政策、疫情与科研报道。' },
      ],
    },

    modules: {
      eyebrow: '平台',
      title: '六大互联模块，一体化体验',
      lead:
        '每个模块单独使用都有价值。合在一起，它们省去了反复切换标签页、凭空猜测与重复搜索，而这些正是获取健康信息最累人的地方。',
      items: [
        {
          tag: '知识',
          title: '健康知识库',
          desc: '写给真实读者的疾病指南：症状、病因、诊断、治疗、自我照护，以及真正要紧的预警信号。',
        },
        {
          tag: '药品',
          title: '药品专论',
          desc: '通用名与商品名、规格、剂型、相互作用、禁忌与储存条件，按固定周期复核。',
        },
        {
          tag: '诊断',
          title: '检验中心',
          desc: '涵盖各项常规检查的准备、样本类型、出具时间，以及用通俗语言解释各项数值的含义。',
        },
        {
          tag: '名录',
          title: '医疗服务名录',
          desc: '医院、专科医生、诊所、药房与急诊，按位置与专科标注在地图上并可检索。',
        },
        {
          tag: '智能',
          title: 'AI 健康助手',
          desc: '用任何受支持的语言提问。回答会标注出处、说明局限，绝不编造诊断。',
        },
        {
          tag: '协同',
          title: '健康档案与协同',
          desc: '把就诊、检查结果、处方与照护方案集中管理，并按您的选择分享给医生。',
        },
      ],
    },

    how: {
      eyebrow: '使用方式',
      title: '三步，没有猜测',
      lead: '所有设计都围绕一个问题：接下来该怎么办？',
      items: [
        {
          title: '描述您的情况',
          desc: '输入或语音均可。从一个症状、一种药、一份结果，或用日常语言提出的问题开始。',
        },
        {
          title: '获得结构化的解答',
          desc: '分节清晰、附有出处，并明确说明哪些内容尚不确定，同时指出何时必须寻求专业医疗。',
        },
        {
          title: '据此行动',
          desc: '预约、收藏、打印或分享。每一个回答都以一个决定告终，而不是再开一个标签页。',
        },
      ],
    },

    features: {
      eyebrow: '为真实世界而建',
      title: '快速、无障碍，并且默认诚实',
      lead:
        '网上的健康内容大多加载缓慢、广告满天、难以阅读。GlobalHealth 恰恰相反。',
      items: [
        {
          title: '两秒内完成加载',
          desc: '静态优先的页面、按需加载的代码、预加载字体，且不含任何第三方追踪。整体骨架只有几 KB。',
        },
        {
          title: '从右向左与八种文字',
          desc: '阿拉伯语原生支持 RTL。拉丁文、天城文与中日韩文字都配有专门调校的字体栈与行高。',
        },
        {
          title: '键盘与屏幕阅读器完全可用',
          desc: '每一个控件都可聚焦且有标注，提供 ⌘K 命令面板、清晰焦点与减少动态效果支持。',
        },
        {
          title: '数字格式随地区',
          desc: '日期、剂量与数值都按您所在地区呈现，计算器可在公制与英制之间切换。',
        },
        {
          title: '紧急情况永远优先',
          desc: '每个覆盖国家的本地急救电话，在任何页面上都只需一次点击。',
        },
        {
          title: '对局限保持透明',
          desc: '出处、复核日期与可信度都公开展示。证据不足时，我们直说，而不是猜测。',
        },
      ],
    },

    standards: {
      eyebrow: '信任与安全',
      title: '健康信息只有值得信赖，才真正有用',
      lead: '这些标准落实在我们的发布流程中，而不只写在政策里。',
      items: [
        {
          title: '临床复核',
          desc: '每一个临床主题都由具备资质的专业人员进行复核，并记录姓名、专科与复核日期。',
        },
        {
          title: '来源可追溯',
          desc: '每一项论断都链接到其来源的指南、试验或监管通告。',
        },
        {
          title: '编辑独立性',
          desc: '没有药品广告，没有结果中的付费置顶，临床内容中也没有返利链接。',
        },
        {
          title: '明确标注局限',
          desc: '每个页面都会说明它不涵盖什么，以及何时应当停止阅读并联系医生。',
        },
      ],
      note:
        'GlobalHealth 提供健康信息与就医协同工具。它不是医学监管机构，不作诊断，也不能取代持证医生或急救服务。',
    },

    faq: {
      eyebrow: '常见问题',
      title: '开始之前，大家都会问的',
      lead: '还有疑问？我们的支持团队会在一个工作日内回复。',
      items: [
        {
          q: 'GlobalHealth 能代替医生吗？',
          a: '不能。GlobalHealth 解释健康信息，帮助您与医生进行更有效的沟通。它不作诊断、不开处方、不提供治疗。如果存在危险，请立即联系当地急救服务。',
        },
        {
          q: '需要注册账号吗？',
          a: '不需要。知识库、药品专论、检验指南、就医名录与 AI 助手全部开放。只有在需要保存个人档案与协同时才需要账号。',
        },
        {
          q: '内容准确性如何保证？',
          a: '每个临床页面都标注复核人、专科与复核日期。有固定复核周期的内容会在到期前被标记，并在重新签核之前显著降级展示。',
        },
        {
          q: '支持哪些语言？',
          a: '完整界面提供八种语言，包括从右向左的阿拉伯语。助手也可以用您输入的语言作答。',
        },
        {
          q: '我的健康数据私密吗？',
          a: '阅读内容无需账号，也不会建立档案。您选择保存的内容属于您，可随时导出，绝不出售，也不用于广告。',
        },
        {
          q: '费用是多少？',
          a: '核心健康信息免费，没有广告，也不转售数据。机构版则提供治理、审计日志与系统集成。',
        },
      ],
    },

    cta: {
      title: '从您真正关心的问题开始',
      lead: '无需注册，没有广告，不转售数据。打开平台即刻开始。',
      primary: '探索平台',
      secondary: '联系我们的团队',
      note: '紧急情况？本地急救电话在任何页面上都触手可及。',
    },
  },

  globalTeaser: {
    eyebrow: '全球',
    title: '为跨境医疗的真实运作方式而设计',
    lead:
      '一个全球平台必须尊重差异极大的法规、语言与现实。GlobalHealth 从第一行代码起就是这样设计的。',
    items: [
      { region: '南亚', countries: '印度、孟加拉国、尼泊尔、斯里兰卡', note: '本地语言内容，低带宽模式' },
      { region: '欧洲与英国', countries: '欧盟、欧洲经济区、瑞士、英国', note: '符合 GDPR 的数据驻留控制' },
      { region: '美洲', countries: '美国、加拿大、墨西哥、巴西', note: '美元/加元/比索/雷亚尔定价与格式' },
      { region: '非洲与中东', countries: '尼日利亚、肯尼亚、南非、阿联酋、沙特阿拉伯', note: '阿拉伯语 RTL，低带宽下回退为短信' },
      { region: '亚太', countries: '中国、日本、新加坡、澳大利亚、印度尼西亚', note: '中日韩排版与公制默认设置' },
      { region: '世界其他地区', countries: '190 多个国家和地区', note: '按地区适配数字、日期与单位格式' },
    ],
    cta: '查看全球覆盖',
  },

  pages: {
    platform: {
      eyebrow: '平台',
      title: '一个用于理解、决策与行动的系统',
      lead:
        'GlobalHealth 取代了人们自己拼凑出来的十一个标签页、三份 PDF 和一个搜索引擎。所有模块共享同一身份、同一档案与同一套设计语言。',
      heroPoints: [
        '静态优先渲染，并渐进增强',
        '所有模块共用一套无障碍组件系统',
        '从首次请求起即适配地区，包括从右向左',
        '每一条临床论断都附出处与复核日期',
      ],
      moduleHeading: '每个模块之内',
      performance: {
        eyebrow: '工程',
        title: '速度本身就是临床功能',
        lead: '一个需要六秒才出现的页面，对很多人来说无法使用，对有些人来说则很危险。这些是我们对自己的要求。',
        items: [
          { label: '4G 环境下 LCP 中位数', value: '< 1.2 秒' },
          { label: '累积布局偏移', value: '< 0.02' },
          { label: '首屏 JavaScript', value: '< 20 kB' },
          { label: '第三方追踪器', value: '0' },
        ],
      },
      architecture: {
        eyebrow: '架构',
        title: '各部分如何协同',
        items: [
          {
            title: '默认静态',
            desc: '所有公开页面在构建时预渲染，并由 CDN 边缘节点分发。阅读健康信息不需要回源服务器。',
          },
          {
            title: '孤岛式交互，而非应用外壳',
            desc: '搜索、计算器、表单等交互部分，仅在使用处作为独立的小模块加载，其余皆为静态 HTML。',
          },
          {
            title: '可离线使用',
            desc: 'Service Worker 缓存阅读体验，即使在网络不佳或服务中断时，核心指引依然可用。',
          },
          {
            title: '无障碍基线',
            desc: '语义地标、焦点管理、高于 WCAG 2.2 AA 的对比度，以及完整的键盘可操作性，都在持续集成中检验。',
          },
        ],
      },
      security: {
        eyebrow: '信任',
        title: '默认的隐私与安全',
        items: [
          '任何健康页面上都没有广告或用户画像脚本。',
          '个人档案在传输与存储时均加密，并可由本人导出。',
          '同意机制明确、可撤回，并记录时间戳。',
          '对第三方的请求仅限于自托管字体与我们自己的 API。',
        ],
      },
    },

    solutions: {
      eyebrow: '解决方案',
      title: '一个平台，四种用法',
      lead: '无论您是在管理自己的健康，还是在运营一家医院，GlobalHealth 都能在您工作的地方与您相遇。',
      personas: [
        {
          key: 'individuals',
          label: '面向个人',
          title: '不靠猜测地看懂自己的健康',
          desc: '搜索一个症状、一种药品或一份结果，获得有结构、有出处的解释，然后自信地迈出下一步。',
          points: [
            '症状解读，并明确标注预警信号',
            '含相互作用与警示的药品专论',
            '检查前准备与结果解读',
            '收藏、打印摘要与提醒',
            '全天候使用您语言的 AI 助手',
          ],
        },
        {
          key: 'clinicians',
          label: '面向医务工作者',
          title: '在诊疗现场获得可靠答案',
          desc: '减少花在检索上的时间。所有内容都经过复核、标注日期且可引用，既适用于问诊，也适用于教学。',
          points: [
            '疾病、检验与药品的全文检索',
            '附出处的可分享患者摘要',
            '低连接病区中的离线访问',
            '面向青年团队与学生的教学材料',
            '每一个共享资源的审计记录',
          ],
        },
        {
          key: 'hospitals',
          label: '面向医院',
          title: '贯穿各科室的公共层',
          desc: '为员工与患者提供统一、受治理的健康信息来源，并满足监管方对本地化、治理与报表的要求。',
          points: [
            '机构身份、单点登录与基于角色的权限',
            '定制内容策略与审批流程',
            '使用、质量与公平性报表',
            '区域托管与数据驻留选项',
            '与现有 HIS 和门户系统集成',
          ],
        },
        {
          key: 'pharmacies',
          label: '面向药房',
          title: '顾客真正愿意读的发药信息',
          desc: '在交付药品的那一刻，用顾客的语言、以您的品牌，清楚说明他正在服用什么。',
          points: [
            '面向患者的品牌药品专论页面',
            '相互作用与重复用药警示',
            '用药指导清单与可打印手册',
            '库存、替代与供应信息',
            '以白标方式嵌入您自己的网站',
          ],
        },
      ],
      cta: {
        title: '有更具体的需求吗？',
        lead: '告诉我们您想改进哪一项工作流程，我们会把它映射到平台上。',
        primary: '联系我们的团队',
        secondary: '了解我们的信任原则',
      },
    },

    global: {
      eyebrow: '全球',
      title: '尊重你所在之处的健康平台',
      lead:
        '在这里，本地化不是一次翻译工序。文字方向、数字与日期格式、默认单位、法律框架与急救引导，都是产品本身的一部分。',
      principles: {
        eyebrow: '原则',
        title: '在这里，「全球」意味着什么',
        items: [
          {
            title: '从右向左是原生的',
            desc: '阿拉伯语并非事后镜像。界面基于逻辑属性构建，因此整个界面——包括命令面板与图表——都能正确地镜像翻转。',
          },
          {
            title: '按文字系统排版',
            desc: '拉丁文使用调校过的几何字体，阿拉伯文使用专属 Naskh 字体，天城文有独立字体栈，中日韩文字则直接使用系统字体，避免数 MB 的下载。',
          },
          {
            title: '处处本地化',
            desc: '日期、时间、小数分隔符、电话号码与度量单位都遵循您的地区设置，而不是我们的。',
          },
          {
            title: '默认适配低带宽',
            desc: '精简模式会移除图片与动画，紧急指引会降级为在任何地方都能显示的纯文本。',
          },
          {
            title: '尊重法律框架',
            desc: '按地区设置同意、数据驻留与保留策略，并在欧盟与欧洲经济区默认采用符合 GDPR 的配置。',
          },
          {
            title: '本地急救引导',
            desc: '在任何页面上，一次点击即可到达您所在国家的正确急救号码。',
          },
        ],
      },
      emergency: {
        eyebrow: '紧急情况',
        title: '此刻您需要的号码',
        lead:
          'GlobalHealth 不是急救服务。如果有人处于紧急危险之中，请拨打下表中您所在国家或当地的急救号码。',
        searchLabel: '搜索国家',
        searchPlaceholder: '按国家名称搜索…',
        empty: '没有匹配的国家。',
        showAll: '显示所有国家',
        tableNumber: '急救号码',
        tableRegion: '地区',
        copied: '号码已复制',
        callNow: '拨打',
        general: '通用急救',
        note: '这些号码与各国主管部门共同维护。如果您所在国家的号码有误，请告知我们以便更正。',
        report: '报告错误号码',
      },
      regions: {
        eyebrow: '覆盖',
        title: 'GlobalHealth 服务覆盖',
        items: [
          { region: '南亚', countries: '印度、孟加拉国、尼泊尔、斯里兰卡', note: '本地语言内容，低带宽模式' },
          { region: '欧洲与英国', countries: '欧盟、欧洲经济区、瑞士、英国', note: '符合 GDPR 的数据驻留控制' },
          { region: '美洲', countries: '美国、加拿大、墨西哥、巴西', note: '美元/加元/比索/雷亚尔定价与格式' },
          { region: '非洲与中东', countries: '尼日利亚、肯尼亚、南非、阿联酋、沙特阿拉伯', note: '阿拉伯语 RTL，低带宽下回退为短信' },
          { region: '亚太', countries: '中国、日本、新加坡、澳大利亚、印度尼西亚', note: '中日韩排版与公制默认设置' },
          { region: '世界其他地区', countries: '190 多个国家和地区', note: '按地区适配数字、日期与单位格式' },
        ],
      },
    },

    about: {
      eyebrow: '关于我们',
      title: '我们打造可以据以行动的健康信息',
      lead:
        'GlobalHealth 的存在，是因为一份已发布的指南与一个人家中的餐桌之间的距离，至今仍以数小时的搜索来衡量，而且常常以死胡同告终。',
      mission: {
        eyebrow: '使命',
        title: '我们为何而做',
        items: [
          {
            title: '重理解而非重数量',
            desc: '一万两千篇浅显的内容对谁都没有帮助。我们发布更少的主题，并让每一个都真正完整。',
          },
          {
            title: '清晰但不牺牲严谨',
            desc: '我们保留临床含义，去掉术语，让读者无需词典也能行动。',
          },
          {
            title: '从构建之初就是全球化的',
            desc: '本地化、无障碍与低带宽是硬性要求，而不是之后才补的本地化冲刺。',
          },
          {
            title: '诚实本身就是一项功能',
            desc: '我们公开复核日期、出处与可信度，并在确实不知道时直说。',
          },
        ],
      },
      story: {
        eyebrow: '我们的历程',
        title: '我们如何走到今天',
        paragraphs: [
          'GlobalHealth 最初是一份内部参考资料，服务于那些厌倦了反复解释同样二十个问题的临床教育者。经过多轮复核与读者的真实反馈，它成长为一个人们此前从未接触过的公开平台。',
          '这一增长改变了任务本身。面向医生的资源与面向乡村诊所里十四岁少年的资源并不是同一个产品，而假装它们相同，正是健康信息最终产生误导的方式。平台的设计让临床医生获得深度、让初次阅读者获得清晰——在同一个页面上。',
          '我们刻意保持独立：没有广告，没有临床结果中的付费置顶，也不转售数据。这是一个商业决定，但也是编辑标准之所以有意义的原因。',
        ],
      },
      governance: {
        eyebrow: '治理',
        title: '决策如何产生',
        items: [
          { title: '编辑独立', desc: '临床内容由临床医生与编辑决定，绝不由商业伙伴决定。' },
          { title: '署名负责', desc: '每个页面都记录作者、复核人、专科与下次复核日期。' },
          { title: '公开更正', desc: '错误在原处修正并附上可见的变更说明，我们不会悄悄删除指引。' },
          { title: '独立监督', desc: '外部临床顾问委员会每季度审查标准，并可否决一次发布。' },
        ],
      },
      numbers: {
        eyebrow: '今天',
        title: '我们的现状',
        items: [
          { value: '12,000+', label: '经临床医生审核的主题' },
          { value: '190+', label: '国家与地区' },
          { value: '8', label: '界面语言' },
          { value: '0', label: '广告主与数据转售方' },
        ],
      },
    },

    contact: {
      eyebrow: '联系我们',
      title: '与真人沟通',
      lead:
        '关于内容的问题、错误的急救号码、合作意向或媒体垂询——这些都会到达对应的团队。我们会在一个工作日内回复。',
      channels: [
        {
          title: '一般咨询',
          desc: '任何不属于其他渠道的问题。',
          value: 'hello@globalhealth.health',
          href: 'mailto:hello@globalhealth.health',
        },
        {
          title: '临床更正',
          desc: '报告临床页面中的不准确之处，请附页面链接。',
          value: 'clinical@globalhealth.health',
          href: 'mailto:clinical@globalhealth.health',
        },
        {
          title: '合作与机构',
          desc: '医院、连锁药房、医疗系统与政府机构。',
          value: 'partners@globalhealth.health',
          href: 'mailto:partners@globalhealth.health',
        },
        {
          title: '媒体与新闻',
          desc: '媒体垂询、采访与品牌素材。',
          value: 'press@globalhealth.health',
          href: 'mailto:press@globalhealth.health',
        },
      ],
      form: {
        title: '给我们留言',
        lead: '标有必填的字段需要填写。我们仅将您的信息用于回复。',
        topic: '主题',
        topicPlaceholder: '请选择主题…',
        topics: ['一般咨询', '临床更正', '商务合作', '媒体垂询', '无障碍问题', '其他'],
        name: '您的姓名',
        email: '电子邮箱',
        organisation: '机构',
        organisationPlaceholder: '选填 — 医院、高校、媒体',
        message: '留言内容',
        messagePlaceholder: '请说明您的需求；若涉及具体内容，请附上链接。',
        consent: '我同意 GlobalHealth 为回复我而保存这些信息。',
        submit: '发送留言',
        sending: '发送中…',
        successTitle: '留言已发送',
        successBody: '谢谢您。我们已收到您的留言，并会在一个工作日内回复。',
        sendAnother: '再发一条留言',
        errorTitle: '发送失败',
        errorBody: '我们这边出现了问题，请重试，或直接发送邮件给我们。',
        requiredField: '此项为必填。',
        invalidEmail: '请输入有效的电子邮箱地址。',
        tooShort: '请补充一些细节，以便我们更好地协助。',
        consentRequired: '请先确认同意，我们才能回复。',
        charCount: '字',
      },
      response: {
        title: '接下来会发生什么',
        items: [
          { title: '一个工作日内', desc: '由署名的真人回复您，而不是自动回复。' },
          { title: '五天内', desc: '临床更正会交由复核人核实，并予以修正或说明。' },
          { title: '始终', desc: '任何涉及患者安全的紧急问题都会在当天升级处理。' },
        ],
      },
      accessibility: {
        title: '发现了无障碍障碍吗？',
        desc: '请告诉我们页面地址以及发生了什么。我们把无障碍缺陷视为生产缺陷，按同等标准修复。',
        cta: '报告障碍',
      },
    },

    legal: {
      lastUpdated: '最后更新',
      languageNotice: '本文档以英文发布，下方提供中文摘要。',
      languageSummary: '摘要',
      privacySummary: '我们在任何健康页面上都不投放广告、不做追踪，绝不出售数据；您保存的一切都属于您，并可随时导出。健康信息经过加密，您可以随时访问、更正或删除。',
    termsSummary: 'GlobalHealth 提供的是一般健康科普信息，并非医疗建议，也不构成医患关系。内容可在注明出处的前提下引用；批量复制需事先获得书面许可。',
    contents: '本页内容',
      backToTop: '返回顶部',
    },

    notFound: {
      code: '404',
      title: '找不到该页面',
      lead: '链接可能已经失效，或者页面已被移动。以下是最快的返回方式。',
      primary: '前往首页',
      secondary: '搜索 GlobalHealth',
      help: '还是没找到？',
      helpText: '告诉我们您想找什么，我们会把您带过去。',
    },
  },
};

export default zh;
