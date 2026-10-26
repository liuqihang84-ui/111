export const PARTS = [
  {
    "id": "inner",
    "name": "内屏显示总成",
    "en": "FOLDABLE DISPLAY",
    "category": "structure",
    "system": "显示系统",
    "glyph": "▱",
    "subtitle": "Super Retina XDR",
    "description": "一整块连续的柔性 OLED 内屏。中央弯折区与两侧显示面平滑衔接，展开时没有两套独立边框；合拢时随铰链弯曲。",
    "specs": [
      [
        "对角线",
        "7.6 inches"
      ],
      [
        "分辨率",
        "2670 × 1878"
      ],
      [
        "像素密度",
        "430 ppi"
      ],
      [
        "刷新率",
        "最高 120 Hz"
      ]
    ],
    "source": "官方显示参数 · 层叠结构示意",
    "label": true
  },
  {
    "id": "outer",
    "name": "外屏显示总成",
    "en": "COVER DISPLAY",
    "category": "structure",
    "system": "显示系统",
    "glyph": "▯",
    "subtitle": "Compact. Always ready.",
    "description": "合拢后仍可使用的外部显示屏。右上角为圆形前摄开孔；靠铰链的一侧较方直，外侧两角更圆润。",
    "specs": [
      [
        "对角线",
        "5.4 inches"
      ],
      [
        "分辨率",
        "1398 × 2034"
      ],
      [
        "像素密度",
        "460 ppi"
      ],
      [
        "刷新率",
        "最高 120 Hz"
      ]
    ],
    "source": "官方显示参数",
    "label": false
  },
  {
    "id": "glass",
    "name": "背部玻璃",
    "en": "CERAMIC SHIELD BACK",
    "category": "structure",
    "system": "外观结构",
    "glyph": "▰",
    "subtitle": "Night Sky / Star White",
    "description": "Ceramic Shield 背部覆盖件。横向胶囊相机岛容纳双摄，麦克风与闪光灯分布在镜头旁，中央标记与背板保持低对比。",
    "specs": [
      [
        "材质",
        "Ceramic Shield"
      ],
      [
        "配色",
        "Night Sky / Star White"
      ],
      [
        "整机重量",
        "254 g"
      ],
      [
        "几何尺寸",
        "按整机比例重构"
      ]
    ],
    "source": "官方材质与重量 · 几何示意",
    "label": false
  },
  {
    "id": "frameL",
    "name": "左侧钛金属框架",
    "en": "TITANIUM CHASSIS · L",
    "category": "structure",
    "system": "外观结构",
    "glyph": "⊏",
    "subtitle": "A precision foundation",
    "description": "外屏一侧的钛金属承力框架，容纳独立 I/O 板、USB-C 和声学组件。铰链侧接合边近乎方直，外侧为连续圆角。",
    "specs": [
      [
        "框架材质",
        "Titanium"
      ],
      [
        "展开整机",
        "164.6 × 117.8 mm"
      ],
      [
        "展开厚度",
        "5.2 mm"
      ],
      [
        "内部公差",
        "未按工程公差建模"
      ]
    ],
    "source": "官方整机尺寸 · 局部尺寸示意",
    "label": false
  },
  {
    "id": "frameR",
    "name": "右侧钛金属框架",
    "en": "TITANIUM CHASSIS · R",
    "category": "structure",
    "system": "外观结构",
    "glyph": "⊐",
    "subtitle": "The other half",
    "description": "双摄背玻璃一侧的钛金属框架，承载主板、屏下摄像头与触觉模块。音量双键位于顶边，侧边设有 Touch ID 与 Camera Control。",
    "specs": [
      [
        "框架材质",
        "Titanium"
      ],
      [
        "折叠整机",
        "84.1 × 117.8 mm"
      ],
      [
        "折叠厚度",
        "11.3 mm"
      ],
      [
        "防护等级",
        "IP68"
      ]
    ],
    "source": "官方整机参数 · 局部尺寸示意",
    "label": false
  },
  {
    "id": "hinge",
    "name": "精密折叠铰链",
    "en": "CENTRAL HINGE",
    "category": "structure",
    "system": "折叠机构",
    "glyph": "⋮",
    "subtitle": "Two halves. One movement.",
    "description": "外部光滑的钛金属脊盖保护中央机构。内屏在连续曲面上弯折；内部联动关节只在拆解后呈现。",
    "specs": [
      [
        "演示展开角",
        "0–180°"
      ],
      [
        "机构",
        "分段轴套 / 支撑臂"
      ],
      [
        "齿轮结构",
        "程序化结构示意"
      ],
      [
        "尺寸与材料",
        "非工程测量值"
      ]
    ],
    "source": "维修结构参考 · 运动学示意",
    "label": true
  },
  {
    "id": "batteryL",
    "name": "左侧电池",
    "en": "BATTERY PACK · L",
    "category": "core",
    "system": "供电系统",
    "glyph": "▥",
    "subtitle": "Dual-battery architecture",
    "description": "外屏侧的独立金属壳电池，位于 I/O 板与顶扬声器之间。与另一半机身中的电池共同供电，使用电释放胶固定。",
    "specs": [
      [
        "系统",
        "双电池 / 金属外壳"
      ],
      [
        "两块总能量",
        "19.1 Wh（拆机）"
      ],
      [
        "粘合方式",
        "电释放胶"
      ],
      [
        "外形",
        "外屏侧 / 矩形"
      ]
    ],
    "source": "Apple 内部视图 / iFixit 拆机",
    "label": true
  },
  {
    "id": "batteryR",
    "name": "右侧电池",
    "en": "BATTERY PACK · R",
    "category": "core",
    "system": "供电系统",
    "glyph": "▥",
    "subtitle": "Power across both sides",
    "description": "双摄侧的 L 形金属壳电池，在主板旁留出避让空间。两块电池在拆机资料中分别标为7.5 Wh与11.6 Wh，总计19.1 Wh。",
    "specs": [
      [
        "系统",
        "双电池 / 金属外壳"
      ],
      [
        "两块总能量",
        "19.1 Wh（拆机）"
      ],
      [
        "粘合方式",
        "电释放胶"
      ],
      [
        "外形",
        "双摄侧 / L 形"
      ]
    ],
    "source": "iFixit 拆机 · 几何示意",
    "label": false
  },
  {
    "id": "board",
    "name": "逻辑主板",
    "en": "LOGIC BOARD",
    "category": "core",
    "system": "计算系统",
    "glyph": "▦",
    "subtitle": "A20 Pro at the center",
    "description": "平面化逻辑主板承载计算、存储与通信器件。它与独立 I/O 板分工，沿电池的避让区域布置。",
    "specs": [
      [
        "主芯片",
        "A20 Pro"
      ],
      [
        "CPU",
        "6 核"
      ],
      [
        "GPU",
        "7 核"
      ],
      [
        "神经网络引擎",
        "双 16 核"
      ]
    ],
    "source": "官方芯片参数 / iFixit · 布局示意",
    "label": true
  },
  {
    "id": "mainCamera",
    "name": "4800万像素主摄",
    "en": "FUSION MAIN CAMERA",
    "category": "core",
    "system": "影像系统",
    "glyph": "◎",
    "subtitle": "48MP Fusion Main",
    "description": "4800万像素主摄，带传感器位移式光学防抖。多层镜片、光阑与传感器封装形成完整影像模组。",
    "specs": [
      [
        "像素",
        "48 MP"
      ],
      [
        "等效焦距",
        "26 mm"
      ],
      [
        "光圈",
        "ƒ/1.6"
      ],
      [
        "防抖",
        "传感器位移式 OIS"
      ]
    ],
    "source": "官方影像参数 · 模组几何示意",
    "label": true
  },
  {
    "id": "ultraCamera",
    "name": "4800万像素超广角",
    "en": "FUSION ULTRA WIDE",
    "category": "core",
    "system": "影像系统",
    "glyph": "◉",
    "subtitle": "A wider perspective",
    "description": "4800万像素超广角，提供120°视角。它与主摄紧邻横排，分别穿过背盖与相机岛的独立开孔。",
    "specs": [
      [
        "像素",
        "48 MP"
      ],
      [
        "等效焦距",
        "13 mm"
      ],
      [
        "光圈",
        "ƒ/2.2"
      ],
      [
        "视角",
        "120°"
      ]
    ],
    "source": "官方影像参数 · 模组几何示意",
    "label": false
  },
  {
    "id": "frontCamera",
    "name": "前置影像模组",
    "en": "FRONT CAMERA MODULE",
    "category": "core",
    "system": "影像系统",
    "glyph": "◌",
    "subtitle": "Center Stage",
    "description": "位于外屏右上方的 Center Stage 前摄。实体开孔为圆形，动态岛的界面状态不等同于永久长条开孔。",
    "specs": [
      [
        "外屏前置",
        "12 MP"
      ],
      [
        "光圈",
        "ƒ/2.2"
      ],
      [
        "功能",
        "Center Stage"
      ],
      [
        "内部封装",
        "结构示意"
      ]
    ],
    "source": "官方外屏前置参数 · 结构示意",
    "label": false
  },
  {
    "id": "speaker",
    "name": "扬声器模组",
    "en": "SPEAKER ASSEMBLY",
    "category": "detail",
    "system": "声学系统",
    "glyph": "≋",
    "subtitle": "Sound, in a small space",
    "description": "微型声腔与出音孔连接机身外部。两侧声学组件分布在各自的内部腔体中。",
    "specs": [
      [
        "组件",
        "声腔 / 振膜 / 网孔"
      ],
      [
        "触点",
        "金属弹性触点示意"
      ],
      [
        "孔阵列",
        "程序化生成"
      ],
      [
        "局部尺寸",
        "结构示意"
      ]
    ],
    "source": "维修结构参考 · 非实测几何",
    "label": false
  },
  {
    "id": "taptic",
    "name": "触觉反馈模组",
    "en": "HAPTIC ENGINE",
    "category": "detail",
    "system": "触觉系统",
    "glyph": "▤",
    "subtitle": "An interaction you can feel",
    "description": "通过内部配重与电磁驱动产生细腻触觉反馈，固定在双摄侧机身底部。",
    "specs": [
      [
        "作用",
        "触觉反馈"
      ],
      [
        "外壳",
        "金属壳体示意"
      ],
      [
        "内部",
        "配重 / 线圈示意"
      ],
      [
        "精确型号",
        "未核实"
      ]
    ],
    "source": "内部组件示意",
    "label": false
  },
  {
    "id": "usb",
    "name": "USB-C 接口组件",
    "en": "USB-C CONNECTOR",
    "category": "detail",
    "system": "连接系统",
    "glyph": "⊖",
    "subtitle": "A physical connection",
    "description": "位于外屏半机身底边的 USB-C 连接组件，包含金属屏蔽壳、接口舌片与触点。",
    "specs": [
      [
        "接口",
        "USB-C"
      ],
      [
        "可见触点",
        "代码生成"
      ],
      [
        "组件",
        "屏蔽壳 / 舌片 / 排线"
      ],
      [
        "尺寸",
        "结构示意"
      ]
    ],
    "source": "接口类型参考 · 几何示意",
    "label": false
  },
  {
    "id": "flex",
    "name": "柔性连接排线",
    "en": "FLEX INTERCONNECT",
    "category": "detail",
    "system": "连接系统",
    "glyph": "⌁",
    "subtitle": "Connecting the assembly",
    "description": "连接显示、供电和计算模块的柔性电路。在铰链附近采用折叠余量，以适应两半机身的相对运动。",
    "specs": [
      [
        "类型",
        "FPC 柔性电路"
      ],
      [
        "颜色",
        "琥珀色聚酰亚胺示意"
      ],
      [
        "触点",
        "镀金连接器示意"
      ],
      [
        "布线",
        "可视化简化"
      ]
    ],
    "source": "维修结构参考 · 连接路径示意",
    "label": false
  },
  {
    "id": "shield",
    "name": "屏蔽罩与散热层",
    "en": "SHIELD & THERMAL LAYER",
    "category": "detail",
    "system": "散热与电磁屏蔽",
    "glyph": "▧",
    "subtitle": "Protected, layer by layer",
    "description": "位于内屏下方的支撑与屏蔽层，为显示组件提供平整承托，并帮助控制电磁干扰与热量传导。",
    "specs": [
      [
        "作用",
        "屏蔽 / 热量传导"
      ],
      [
        "可见层",
        "金属罩 / 石墨层示意"
      ],
      [
        "固定方式",
        "紧固件示意"
      ],
      [
        "精确材料",
        "未核实"
      ]
    ],
    "source": "内部层叠结构示意",
    "label": false
  },
  {
    "id": "screws",
    "name": "精密螺丝与紧固件",
    "en": "PRECISION FASTENERS",
    "category": "detail",
    "system": "机械紧固",
    "glyph": "⊕",
    "subtitle": "Down to the last detail",
    "description": "逐枚生成的螺丝包含螺杆、螺旋螺纹和刀口。点击三维中的任一颗螺丝，可独立移出与单独查看；左右箭头可在螺丝之间切换。",
    "specs": [
      [
        "外壳入口",
        "4 × Pentalobe"
      ],
      [
        "内部类型",
        "Crosshead / Super screw"
      ],
      [
        "可见细节",
        "刀口 / 螺纹 / 螺杆"
      ],
      [
        "内部数量",
        "本模型示意配置"
      ]
    ],
    "source": "官方螺丝类型 / 拆机参考 · 数量示意",
    "label": false
  },
  {
    "id": "innerCamera",
    "name": "屏下内摄像头",
    "en": "UNDER-DISPLAY CAMERA",
    "category": "core",
    "system": "影像系统",
    "glyph": "◍",
    "subtitle": "Behind the pixels",
    "description": "位于柔性内屏之下的自拍摄像头。拆机显示，显示像素之间留有透光间隙；此处以独立镜头、封装和连接排线表现其结构。",
    "specs": [
      [
        "位置",
        "柔性内屏下方"
      ],
      [
        "透光方式",
        "像素间隙"
      ],
      [
        "独立组件",
        "第四颗摄像头"
      ],
      [
        "封装尺寸",
        "结构示意"
      ]
    ],
    "source": "iFixit 拆机 · 封装几何示意",
    "label": false
  },
  {
    "id": "ioBoard",
    "name": "独立 I/O 电路板",
    "en": "I/O DAUGHTERBOARD",
    "category": "detail",
    "system": "连接系统",
    "glyph": "▦",
    "subtitle": "A flatter architecture",
    "description": "与主逻辑板分开的平面化 I/O 板，承担部分连接功能。板上连接器、屏蔽件和电路走线为程序化结构示意。",
    "specs": [
      [
        "架构",
        "独立 I/O 板"
      ],
      [
        "布置",
        "非堆叠式"
      ],
      [
        "连接",
        "柔性排线"
      ],
      [
        "元件位置",
        "可视化简化"
      ]
    ],
    "source": "iFixit 拆机 · PCB布局示意",
    "label": false
  }
];
