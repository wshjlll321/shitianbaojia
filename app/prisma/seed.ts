import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { createHash } from 'crypto';

function sha256Base64Url(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('base64url');
}

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(process.cwd(), 'dev.db')}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Generate real bcrypt hashes so login works
  const salesPassword = await bcrypt.hash('shytian2026', 10);
  const adminPassword = await bcrypt.hash('admin2026', 10);

  // ========== Create Sales User ==========
  const salesUser = await prisma.user.upsert({
    where: { email: 'lintao@shytian.com' },
    update: { password: salesPassword, username: 'lintao' },
    create: {
      email: 'lintao@shytian.com',
      username: 'lintao',
      password: salesPassword,
      nameZh: '林涛',
      nameEn: 'Lin Tao',
      phone: '+86 138-0000-8888',
      wechatQr: '',
      role: 'sales',
      isActive: true,
    },
  });
  console.log('✅ Sales user created:', salesUser.nameZh);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shytian.com' },
    update: { password: adminPassword, username: 'admin' },
    create: {
      email: 'admin@shytian.com',
      username: 'admin',
      password: adminPassword,
      nameZh: '管理员',
      nameEn: 'Admin',
      phone: '+86 755-8888-6666',
      role: 'admin',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.nameZh);

  // ========== Create Drone Products ==========
  const t280 = await prisma.product.upsert({
    where: { model: 'T280' },
    update: {},
    create: {
      model: 'T280',
      nameZh: 'T280 大载重无人直升机',
      nameEn: 'T280 Heavy-Lift Unmanned Helicopter',
      nameTh: '',
      category: 'drone',
      imageUrl: '/images/drone-t280.jpg',
      featuresZh: JSON.stringify([
        '最大起飞重量280kg',
        '长航时120分钟',
        '宽温域 -20°C ~ +55°C',
        '模块化快拆设计',
        '全自主飞行控制',
        '多冗余安全系统',
      ]),
      featuresEn: JSON.stringify([
        'Max takeoff weight 280kg',
        'Endurance 120 minutes',
        'Wide temp range -20°C ~ +55°C',
        'Modular quick-release design',
        'Fully autonomous flight control',
        'Multi-redundant safety system',
      ]),
      featuresTh: '[]',
      specsZh: JSON.stringify({
        '最大起飞重量': '280 kg',
        '有效载荷': '80 kg',
        '续航时间': '120 min（无载荷）/ 60 min（满载）',
        '飞行速度': '0-120 km/h',
        '实用升限': '4500 m',
        '旋翼直径': '3600 mm',
        '机身尺寸': '3800 × 1200 × 1500 mm',
        '发动机类型': '双缸水冷对置活塞',
        '燃料类型': '95# 航空汽油',
        '工作温度': '-20°C ~ +55°C',
        '抗风等级': '6级',
        '导航系统': 'RTK+INS+视觉融合',
      }),
      specsEn: JSON.stringify({
        'Max Takeoff Weight': '280 kg',
        'Payload': '80 kg',
        'Endurance': '120 min (no load) / 60 min (full load)',
        'Flight Speed': '0-120 km/h',
        'Service Ceiling': '4500 m',
        'Rotor Diameter': '3600 mm',
        'Dimensions': '3800 × 1200 × 1500 mm',
        'Engine': 'Twin-cylinder water-cooled boxer',
        'Fuel': '95# Aviation gasoline',
        'Operating Temp': '-20°C ~ +55°C',
        'Wind Resistance': 'Level 6',
        'Navigation': 'RTK+INS+Visual fusion',
      }),
      msrp: 1280000,
      exwPrice: 980000,
      fobPrice: 1050000,
      sortOrder: 1,
    },
  });
  console.log('✅ Product created:', t280.model);

  const h15 = await prisma.product.upsert({
    where: { model: 'H15' },
    update: {},
    create: {
      model: 'H15',
      nameZh: 'H15 电动无人直升机',
      nameEn: 'H15 Electric Unmanned Helicopter',
      nameTh: '',
      category: 'drone',
      imageUrl: '/images/drone-h15.png',
      featuresZh: JSON.stringify([
        '纯电动零排放',
        '长航时50分钟',
        '超静音设计 <65dB',
        '快速折叠便携',
        '智能避障系统',
      ]),
      featuresEn: JSON.stringify([
        'Pure electric zero emission',
        'Endurance 50 minutes',
        'Ultra-quiet design <65dB',
        'Quick-fold portable',
        'Smart obstacle avoidance',
      ]),
      featuresTh: '[]',
      specsZh: JSON.stringify({
        '最大起飞重量': '25 kg',
        '有效载荷': '8 kg',
        '续航时间': '50 min（无载荷）/ 35 min（满载）',
        '飞行速度': '0-80 km/h',
        '实用升限': '3000 m',
        '旋翼直径': '1800 mm',
        '机身尺寸': '1900 × 580 × 780 mm',
        '折叠尺寸': '980 × 580 × 680 mm',
        '电池': '12S 22000mAh LiPo',
        '充电时间': '60分钟（快充）',
        '工作温度': '-10°C ~ +45°C',
        '噪音水平': '< 65 dB @ 10m',
      }),
      specsEn: JSON.stringify({
        'Max Takeoff Weight': '25 kg',
        'Payload': '8 kg',
        'Endurance': '50 min (no load) / 35 min (full load)',
        'Flight Speed': '0-80 km/h',
        'Service Ceiling': '3000 m',
        'Rotor Diameter': '1800 mm',
        'Dimensions': '1900 × 580 × 780 mm',
        'Folded Size': '980 × 580 × 680 mm',
        'Battery': '12S 22000mAh LiPo',
        'Charging Time': '60 min (fast charge)',
        'Operating Temp': '-10°C ~ +45°C',
        'Noise Level': '< 65 dB @ 10m',
      }),
      msrp: 298000,
      exwPrice: 218000,
      fobPrice: 238000,
      sortOrder: 2,
    },
  });
  console.log('✅ Product created:', h15.model);

  const h60 = await prisma.product.upsert({
    where: { model: 'H60' },
    update: {},
    create: {
      model: 'H60',
      nameZh: 'H60 电动无人植保机',
      nameEn: 'H60 Electric UAV Plant Protection Machine',
      nameTh: '',
      category: 'drone',
      imageUrl: '',
      featuresZh: JSON.stringify([
        '超高性价比电动植保无人机',
        '55L药箱/80L撒播箱模块化切换',
        '折叠臂架碳纤维+航空铝结构',
        '新一代农业智能飞控系统',
        '1080P FPV云台相机',
        '三向雷达避障系统',
        'IP67防水防尘',
        '10分钟快充（三相交流电）',
        '高亮照明灯支持夜间作业',
        'AB点记忆/自主地块规划/断点续飞',
      ]),
      featuresEn: JSON.stringify([
        'Ultra cost-effective electric crop-spraying drone',
        '55L liquid tank / 80L granular tank modular swap',
        'Foldable carbon fiber + aviation aluminum arm truss',
        'New-gen agricultural intelligent flight control',
        '1080P FPV gimbal camera',
        'Three-way radar obstacle avoidance',
        'IP67 waterproof and dustproof',
        '10-min fast charge (3-phase AC)',
        'High-brightness spotlights for night ops',
        'AB point memory / autonomous field planning / breakpoint resume',
      ]),
      featuresTh: '[]',
      specsZh: JSON.stringify({
        '展开尺寸': '3060 × 3050 × 860 mm（含桨）',
        '运输尺寸': '1110 × 850 × 860 mm',
        '最大起飞重量': '106 kg',
        '药箱容量': '55 L（液体）/ 80 L（颗粒）',
        '最大流量': '20 L/min（双叶轮泵）',
        '喷幅': '8-12 m',
        '喷嘴类型': '高精度离心喷嘴（50-500μm雾滴）',
        '作业效率': '3.3公顷/架次 / 20公顷/小时',
        '电池规格': '18S 30000mAh',
        '充电时间': '10分钟快充（三相交流电）',
        '防护等级': 'IP67',
        '导航系统': 'GPS + RTK（厘米级定位）',
        '仿地精度': '≤0.5 m',
      }),
      specsEn: JSON.stringify({
        'Dimensions (Operating)': '3060 × 3050 × 860 mm (incl. propellers)',
        'Dimensions (Transport)': '1110 × 850 × 860 mm',
        'Max Takeoff Weight': '106 kg',
        'Tank Capacity': '55 L (liquid) / 80 L (granular)',
        'Max Flow Rate': '20 L/min (dual impeller pump)',
        'Spraying Width': '8-12 m',
        'Nozzle Type': 'High-precision centrifugal (50-500μm droplet)',
        'Efficiency': '3.3 hectares/mission / 20 hectares/hour',
        'Battery': '18S 30000mAh',
        'Charging': '10-min fast charge (3-phase AC)',
        'Protection Rating': 'IP67',
        'Navigation': 'GPS + RTK (centimeter-level)',
        'Terrain Tracing': '≤0.5 m accuracy',
      }),
      msrp: 168000,
      exwPrice: 128000,
      fobPrice: 138000,
      sortOrder: 3,
    },
  });
  console.log('✅ Product created:', h60.model);

  // ========== Create Accessories ==========
  const gimbal = await prisma.product.upsert({
    where: { model: 'SIYI-ZR30' },
    update: {},
    create: {
      model: 'SIYI-ZR30',
      nameZh: 'SIYI ZR30 光电吊舱',
      nameEn: 'SIYI ZR30 Electro-Optical Gimbal Pod',
      nameTh: '',
      category: 'accessory',
      imageUrl: '/images/gimbal.svg',
      featuresZh: JSON.stringify(['30倍光学变焦', '红外热成像', '三轴稳定']),
      featuresEn: JSON.stringify(['30x Optical Zoom', 'Infrared Thermal', '3-Axis Stabilization']),
      specsZh: JSON.stringify({
        '可见光': '4K / 30倍光学变焦',
        '红外': '640×512 非制冷',
        '稳定': '三轴机械增稳',
        '重量': '860g',
        '接口': 'UART / Ethernet',
      }),
      specsEn: JSON.stringify({
        'Visible': '4K / 30x Optical Zoom',
        'Infrared': '640×512 Uncooled',
        'Stabilization': '3-Axis Mechanical',
        'Weight': '860g',
        'Interface': 'UART / Ethernet',
      }),
      msrp: 68000,
      exwPrice: 48000,
      fobPrice: 52000,
      sortOrder: 10,
    },
  });
  console.log('✅ Accessory created:', gimbal.model);

  const datalink = await prisma.product.upsert({
    where: { model: 'DL-100K' },
    update: {},
    create: {
      model: 'DL-100K',
      nameZh: '100KM 远程数据链路系统',
      nameEn: '100KM Long-Range Data Link System',
      nameTh: '',
      category: 'accessory',
      imageUrl: '/images/datalink.svg',
      featuresZh: JSON.stringify(['100km超远距离', '高清图传', 'AES-256加密']),
      featuresEn: JSON.stringify(['100km Ultra-long Range', 'HD Video Transmission', 'AES-256 Encryption']),
      specsZh: JSON.stringify({
        '通信距离': '≥100 km（视距）',
        '频段': '1.4GHz / 2.4GHz 双频',
        '图传': '1080P@30fps',
        '延迟': '<200ms',
        '加密': 'AES-256',
        '重量': '420g（机载端）',
      }),
      specsEn: JSON.stringify({
        'Range': '≥100 km (LOS)',
        'Frequency': '1.4GHz / 2.4GHz Dual-band',
        'Video': '1080P@30fps',
        'Latency': '<200ms',
        'Encryption': 'AES-256',
        'Weight': '420g (airborne unit)',
      }),
      msrp: 128000,
      exwPrice: 88000,
      fobPrice: 98000,
      sortOrder: 11,
    },
  });
  console.log('✅ Accessory created:', datalink.model);

  const multispectral = await prisma.product.upsert({
    where: { model: 'MS-6B' },
    update: {},
    create: {
      model: 'MS-6B',
      nameZh: '六通道多光谱相机',
      nameEn: '6-Band Multispectral Camera',
      nameTh: '',
      category: 'accessory',
      imageUrl: '/images/multispectral.svg',
      featuresZh: JSON.stringify(['6通道多光谱', 'NDVI实时成像', '农业精准监测']),
      featuresEn: JSON.stringify(['6-Band Multispectral', 'NDVI Real-time Imaging', 'Precision Agriculture']),
      specsZh: JSON.stringify({
        '光谱波段': 'Blue/Green/Red/Red Edge/NIR/RGB',
        '分辨率': '1600×1300 per band',
        'GSD': '8cm @ 120m',
        '重量': '260g',
        '触发方式': 'GPS 同步 / 定时',
      }),
      specsEn: JSON.stringify({
        'Spectral Bands': 'Blue/Green/Red/Red Edge/NIR/RGB',
        'Resolution': '1600×1300 per band',
        'GSD': '8cm @ 120m',
        'Weight': '260g',
        'Trigger': 'GPS Sync / Timer',
      }),
      msrp: 88000,
      exwPrice: 62000,
      fobPrice: 68000,
      sortOrder: 12,
    },
  });
  console.log('✅ Accessory created:', multispectral.model);

  const parachute = await prisma.product.upsert({
    where: { model: 'PRS-280' },
    update: {},
    create: {
      model: 'PRS-280',
      nameZh: '全自动降落伞救生系统',
      nameEn: 'Automatic Parachute Recovery System',
      nameTh: '',
      category: 'accessory',
      imageUrl: '/images/parachute.svg',
      featuresZh: JSON.stringify(['全自动弹射', '自主检测故障', '适配280kg级']),
      featuresEn: JSON.stringify(['Auto Deploy', 'Autonomous Fault Detection', 'For 280kg class']),
      specsZh: JSON.stringify({
        '适配机型': '起飞重量≤300kg',
        '开伞高度': '≥30m',
        '着陆速度': '≤5 m/s',
        '响应时间': '<0.5s',
        '重量': '3.8 kg',
      }),
      specsEn: JSON.stringify({
        'Compatible': 'MTOW ≤300kg',
        'Deploy Altitude': '≥30m',
        'Landing Speed': '≤5 m/s',
        'Response Time': '<0.5s',
        'Weight': '3.8 kg',
      }),
      msrp: 45000,
      exwPrice: 32000,
      fobPrice: 35000,
      sortOrder: 13,
    },
  });
  console.log('✅ Accessory created:', parachute.model);

  // ========== Create SKUs ==========
  await prisma.sKU.upsert({
    where: { sku: 'T280-STD' },
    update: {},
    create: {
      productId: t280.id,
      name: '标准版',
      nameEn: 'Standard Edition',
      sku: 'T280-STD',
      price: 980000,
      descZh: '含主机、地面站、一套桨叶、工具箱',
      descEn: 'Includes aircraft, ground station, 1 set propellers, tool kit',
      isDefault: true,
    },
  });

  await prisma.sKU.upsert({
    where: { sku: 'T280-PRO' },
    update: {},
    create: {
      productId: t280.id,
      name: '专业版',
      nameEn: 'Professional Edition',
      sku: 'T280-PRO',
      price: 1280000,
      descZh: '含标准版全部 + 光电吊舱 + 100KM链路 + 降落伞系统',
      descEn: 'All Standard + EO Gimbal + 100KM Data Link + Parachute System',
      isDefault: false,
    },
  });

  await prisma.sKU.upsert({
    where: { sku: 'H15-STD' },
    update: {},
    create: {
      productId: h15.id,
      name: '标准版',
      nameEn: 'Standard Edition',
      sku: 'H15-STD',
      price: 218000,
      descZh: '含主机、2块电池、充电器、便携箱',
      descEn: 'Includes aircraft, 2 batteries, charger, carry case',
      isDefault: true,
    },
  });

  await prisma.sKU.upsert({
    where: { sku: 'H15-PRO' },
    update: {},
    create: {
      productId: h15.id,
      name: '专业版',
      nameEn: 'Professional Edition',
      sku: 'H15-PRO',
      price: 298000,
      descZh: '含标准版全部 + 4块电池 + 多光谱相机 + RTK模块',
      descEn: 'All Standard + 4 batteries + Multispectral Camera + RTK Module',
      isDefault: false,
    },
  });

  await prisma.sKU.upsert({
    where: { sku: 'H60-STD' },
    update: {},
    create: {
      productId: h60.id,
      name: '标准版',
      nameEn: 'Standard Edition',
      sku: 'H60-STD',
      price: 128000,
      descZh: '含主机、2组电池、充电器、55L药箱、遥控器',
      descEn: 'Includes aircraft, 2 battery sets, charger, 55L tank, remote controller',
      isDefault: true,
    },
  });

  await prisma.sKU.upsert({
    where: { sku: 'H60-PRO' },
    update: {},
    create: {
      productId: h60.id,
      name: '专业版',
      nameEn: 'Professional Edition',
      sku: 'H60-PRO',
      price: 168000,
      descZh: '含标准版全部 + 80L撒播箱 + RTK模块 + 额外2组电池',
      descEn: 'All Standard + 80L granular tank + RTK Module + 2 extra battery sets',
      isDefault: false,
    },
  });

  console.log('✅ SKUs created');

  // ========== Create Accessory Associations ==========
  const accessoryAssociations = [
    { mainProductId: t280.id, accessoryId: gimbal.id, isRecommended: true },
    { mainProductId: t280.id, accessoryId: datalink.id, isRecommended: true },
    { mainProductId: t280.id, accessoryId: parachute.id, isRecommended: true },
    { mainProductId: t280.id, accessoryId: multispectral.id, isRecommended: false },
    { mainProductId: h15.id, accessoryId: gimbal.id, isRecommended: false },
    { mainProductId: h15.id, accessoryId: multispectral.id, isRecommended: true },
    { mainProductId: h60.id, accessoryId: multispectral.id, isRecommended: true },
    { mainProductId: h60.id, accessoryId: datalink.id, isRecommended: false },

  ];

  for (const assoc of accessoryAssociations) {
    await prisma.productAccessory.upsert({
      where: {
        mainProductId_accessoryId: {
          mainProductId: assoc.mainProductId,
          accessoryId: assoc.accessoryId,
        },
      },
      update: {},
      create: assoc,
    });
  }
  console.log('✅ Accessory associations created');

  // ========== Create Demo Quote ==========
  const demoTokenT280 = 'demo-t280-haichuang';
  const demoTokenH15 = 'demo-h15-thaiagri';
  const demoQuote = await prisma.quote.upsert({
    where: { quoteNumber: 'QT-20260413-001' },
    update: {},
    create: {
      quoteNumber: 'QT-20260413-001',
      clientName: '海创智空科技有限公司',
      clientContact: '张伟',
      clientEmail: 'zhangwei@haichuangzk.com',
      titleZh: 'T280 大载重无人直升机报价单',
      titleEn: 'T280 Heavy-Lift Unmanned Helicopter Quotation',
      quoteDate: new Date('2026-04-13'),
      validUntil: new Date('2026-05-13'),
      currency: 'CNY',
      deliveryTerms: 'FOB Qingdao',
      subtotal: 1200000,
      discount: 5,
      totalPrice: 1140000,
      shareTokenHash: sha256Base64Url(demoTokenT280),
      tokenExpiresAt: new Date('2026-06-13'),
      status: 'sent',
      salesId: salesUser.id,
      items: {
        create: [
          {
            productId: t280.id,
            nameZh: 'T280 大载重无人直升机（标准版）',
            nameEn: 'T280 Heavy-Lift Helicopter (Standard)',
            snapshotModel: t280.model,
            snapshotImageUrl: t280.imageUrl || '',
            snapshotFeaturesZh: t280.featuresZh || '[]',
            snapshotFeaturesEn: t280.featuresEn || '[]',
            snapshotSpecsZh: t280.specsZh || '{}',
            snapshotSpecsEn: t280.specsEn || '{}',
            unitPrice: 1050000,
            quantity: 1,
            totalPrice: 1050000,
            sortOrder: 0,
            isMainItem: true,
          },
          {
            productId: gimbal.id,
            nameZh: 'SIYI ZR30 光电吊舱',
            nameEn: 'SIYI ZR30 EO Gimbal Pod',
            snapshotModel: gimbal.model,
            snapshotImageUrl: gimbal.imageUrl || '',
            snapshotFeaturesZh: gimbal.featuresZh || '[]',
            snapshotFeaturesEn: gimbal.featuresEn || '[]',
            snapshotSpecsZh: gimbal.specsZh || '{}',
            snapshotSpecsEn: gimbal.specsEn || '{}',
            unitPrice: 52000,
            quantity: 1,
            totalPrice: 52000,
            sortOrder: 1,
            isMainItem: false,
          },
          {
            productId: datalink.id,
            nameZh: '100KM 远程数据链路系统',
            nameEn: '100KM Long-Range Data Link',
            snapshotModel: datalink.model,
            snapshotImageUrl: datalink.imageUrl || '',
            snapshotFeaturesZh: datalink.featuresZh || '[]',
            snapshotFeaturesEn: datalink.featuresEn || '[]',
            snapshotSpecsZh: datalink.specsZh || '{}',
            snapshotSpecsEn: datalink.specsEn || '{}',
            unitPrice: 98000,
            quantity: 1,
            totalPrice: 98000,
            sortOrder: 2,
            isMainItem: false,
          },
        ],
      },
    },
  });
  console.log('✅ Demo quote created:', demoQuote.quoteNumber);

  // Second demo quote
  const demoQuote2 = await prisma.quote.upsert({
    where: { quoteNumber: 'QT-20260410-002' },
    update: {},
    create: {
      quoteNumber: 'QT-20260410-002',
      clientName: 'Thai Agricultural Tech Co., Ltd.',
      clientContact: 'Somchai',
      clientEmail: 'somchai@thaiagritech.co.th',
      titleZh: 'H15 电动无人直升机报价单',
      titleEn: 'H15 Electric Unmanned Helicopter Quotation',
      quoteDate: new Date('2026-04-10'),
      validUntil: new Date('2026-05-10'),
      currency: 'CNY',
      deliveryTerms: 'CIF Bangkok',
      subtotal: 306000,
      discount: 0,
      totalPrice: 306000,
      shareTokenHash: sha256Base64Url(demoTokenH15),
      tokenExpiresAt: new Date('2026-06-10'),
      status: 'viewed',
      salesId: salesUser.id,
      items: {
        create: [
          {
            productId: h15.id,
            nameZh: 'H15 电动无人直升机（标准版）',
            nameEn: 'H15 Electric Helicopter (Standard)',
            snapshotModel: h15.model,
            snapshotImageUrl: h15.imageUrl || '',
            snapshotFeaturesZh: h15.featuresZh || '[]',
            snapshotFeaturesEn: h15.featuresEn || '[]',
            snapshotSpecsZh: h15.specsZh || '{}',
            snapshotSpecsEn: h15.specsEn || '{}',
            unitPrice: 238000,
            quantity: 1,
            totalPrice: 238000,
            sortOrder: 0,
            isMainItem: true,
          },
          {
            productId: multispectral.id,
            nameZh: '六通道多光谱相机',
            nameEn: '6-Band Multispectral Camera',
            snapshotModel: multispectral.model,
            snapshotImageUrl: multispectral.imageUrl || '',
            snapshotFeaturesZh: multispectral.featuresZh || '[]',
            snapshotFeaturesEn: multispectral.featuresEn || '[]',
            snapshotSpecsZh: multispectral.specsZh || '{}',
            snapshotSpecsEn: multispectral.specsEn || '{}',
            unitPrice: 68000,
            quantity: 1,
            totalPrice: 68000,
            sortOrder: 1,
            isMainItem: false,
          },
        ],
      },
    },
  });
  console.log('✅ Demo quote 2 created:', demoQuote2.quoteNumber);

  // ========== System Config ==========
  await prisma.systemConfig.upsert({
    where: { key: 'company_logo' },
    update: {},
    create: { key: 'company_logo', value: '' },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'company_name' },
    update: {},
    create: { key: 'company_name', value: 'SHYTIAN' },
  });
  console.log('✅ System config initialized');

  console.log('\n🎉 Seed completed successfully!');

  console.log(`\n📎 Demo portal links:`);
  console.log(`   http://localhost:3000/zh/q/${demoTokenT280}`);
  console.log(`   http://localhost:3000/zh/q/${demoTokenH15}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
