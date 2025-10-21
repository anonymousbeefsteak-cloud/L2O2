// 台灣小吃店訂餐系統 - 完整後端代碼（修正電話格式問題）
const CONFIG = {
  BUSINESS_HOURS: {
    start: 10,
    end: 21
  },
  DELIVERY_FEE: 30,
  MAX_ITEMS_PER_ORDER: 10,
  MAX_ORDERS_PER_HOUR: 3,
  SHEETS: {
    ORDERS: 'Orders',
    MENU: 'Menu',
    SETTINGS: 'Settings'
  }
};

// 主處理函數
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function doOptions() {
  return buildCorsResponse({});
}

function handleRequest(e) {
  try {
    let response;
    let requestData = {};
    
    // 解析請求資料
    if (e.postData) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        // 如果 JSON 解析失敗，使用參數
        requestData = e.parameter;
      }
    } else {
      requestData = e.parameter;
    }
    
    const action = requestData.action || '';

    console.log('收到請求 - Action:', action, 'Data:', requestData);

    switch (action) {
      case 'createOrder':
        response = handleCreateOrder(requestData);
        break;
      case 'getOrders':
        response = handleGetOrders(requestData);
        break;
      case 'getOrderHistory':
        response = handleGetOrderHistory(requestData);
        break;
      case 'getMenu':
        response = handleGetMenu();
        break;
      case 'updateOrderStatus':
        response = handleUpdateOrderStatus(requestData);
        break;
      case 'getBusinessHours':
        response = handleGetBusinessHours();
        break;
      case 'test':
        response = { 
          success: true, 
          message: 'API 測試成功', 
          data: requestData,
          timestamp: new Date().toISOString()
        };
        break;
      case 'init':
        response = initializeSystem();
        break;
      case 'addTestData':
        response = { success: true, message: addTestData() };
        break;
      case 'fixPhoneNumbers':
        response = { success: true, message: fixPhoneNumbers() };
        break;
      default:
        response = {
          success: true,
          message: 'API 正常運作',
          availableActions: [
            'createOrder', 'getOrders', 'getMenu', 'test', 'init', 'addTestData', 'fixPhoneNumbers'
          ],
          timestamp: new Date().toISOString()
        };
    }

    console.log('返回回應:', response);
    return buildCorsResponse(response);

  } catch (error) {
    console.error('伺服器錯誤:', error);
    const errorResponse = {
      success: false,
      message: '伺服器錯誤',
      error: error.toString(),
      timestamp: new Date().toISOString()
    };

    return buildCorsResponse(errorResponse);
  }
}

// 修正：正確的 CORS 回應構建
function buildCorsResponse(data) {
  // 使用正確的方法組合
  const output = ContentService.createTextOutput();
  output.setContent(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

// 處理創建訂單 - 修正電話格式處理
function handleCreateOrder(requestData) {
  try {
    const orderData = requestData.orderData || requestData;
    
    console.log('創建訂單資料:', orderData);

    // 輸入驗證
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message
      };
    }

    // 檢查營業時間
    if (!isWithinBusinessHours()) {
      return {
        success: false,
        message: '目前非營業時間 (10:00-21:00)，請在營業時間內下單'
      };
    }

    // 檢查訂單頻率限制
    const rateLimitCheck = checkOrderRateLimit(orderData.customerPhone);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        message: `訂單過於頻繁，請 ${rateLimitCheck.waitMinutes} 分鐘後再試`
      };
    }

    // 生成訂單ID
    const orderId = generateOrderId();
    
    // 計算總金額
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = orderData.deliveryAddress && orderData.deliveryAddress.trim() ? CONFIG.DELIVERY_FEE : 0;
    const totalAmount = subtotal + deliveryFee;

    // 準備訂單記錄 - 確保電話格式正確
    const orderRecord = [
      orderId,
      orderData.customerName,
      formatPhoneForStorage(orderData.customerPhone), // 修正：格式化電話號碼
      orderData.customerLineUserId || 'N/A',
      JSON.stringify(orderData.items),
      subtotal,
      deliveryFee,
      totalAmount,
      orderData.pickupTime,
      orderData.deliveryAddress || '',
      orderData.notes || '',
      'pending', // 狀態: pending, confirmed, completed, cancelled
      new Date().toISOString(),
      '' // 管理備註
    ];

    // 儲存到 Google Sheets
    const orderSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    orderSheet.appendRow(orderRecord);

    console.log('訂單創建成功:', orderId);

    return {
      success: true,
      message: '訂單創建成功',
      data: {
        orderId: orderId,
        totalAmount: totalAmount,
        estimatedWait: '15-20 分鐘',
        pickupTime: orderData.pickupTime
      }
    };

  } catch (error) {
    console.error('創建訂單錯誤:', error);
    return {
      success: false,
      message: '創建訂單失敗',
      error: error.toString()
    };
  }
}

// 查詢訂單 - 主要功能（修正電話比對邏輯）
function handleGetOrders(requestData) {
  try {
    const phone = requestData.phone;
    
    console.log('查詢訂單，手機:', phone);

    if (!phone) {
      return {
        success: false,
        message: '請提供手機號碼'
      };
    }

    // 驗證手機號碼格式
    if (!/^09\d{8}$/.test(phone)) {
      return {
        success: false,
        message: '手機號碼格式不正確'
      };
    }

    const orderSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    
    // 檢查是否有資料
    if (orderSheet.getLastRow() <= 1) {
      console.log('沒有訂單資料');
      return {
        success: true,
        data: [],
        message: '沒有找到任何訂單記錄',
        total: 0
      };
    }

    // 讀取所有訂單資料
    const lastRow = orderSheet.getLastRow();
    const orders = orderSheet.getRange(2, 1, lastRow - 1, 14).getValues();
    
    console.log(`總共找到 ${orders.length} 筆訂單記錄`);

    // 修正：多種電話格式比對
    const userOrders = orders.filter(order => {
      const orderPhone = order[2]; // 手機號碼在第三欄
      return isPhoneMatch(orderPhone, phone);
    });

    console.log(`找到 ${userOrders.length} 筆符合的訂單`);

    // 按時間倒序排列
    const sortedOrders = userOrders.sort((a, b) => {
      const dateA = new Date(a[12] || 0); // 創建時間在第13欄
      const dateB = new Date(b[12] || 0);
      return dateB - dateA;
    });

    // 格式化訂單資料
    const formattedOrders = sortedOrders.map(order => {
      let items = [];
      try {
        if (order[4]) {
          items = JSON.parse(order[4]); // 訂單項目在第5欄
        }
      } catch (e) {
        console.warn('解析訂單項目失敗:', e);
        items = [];
      }
      
      const orderObj = {
        orderId: order[0] || '未知訂單',
        customerName: order[1] || '未知客戶',
        customerPhone: formatPhoneForDisplay(order[2]) || '', // 修正：格式化顯示電話
        customerLineUserId: order[3] || 'N/A',
        items: items,
        subtotal: Number(order[5]) || 0, // 小計在第6欄
        deliveryFee: Number(order[6]) || 0, // 外送費在第7欄
        totalAmount: Number(order[7]) || 0, // 總金額在第8欄
        pickupTime: order[8] || '', // 取餐時間在第9欄
        deliveryAddress: order[9] || '', // 外送地址在第10欄
        notes: order[10] || '', // 備註在第11欄
        status: order[11] || 'pending', // 狀態在第12欄
        createdAt: order[12] || new Date().toISOString(), // 創建時間在第13欄
        remarks: order[13] || '' // 管理備註在第14欄
      };
      
      // 添加狀態文字
      orderObj.statusText = getStatusText(orderObj.status);
      
      return orderObj;
    });

    return {
      success: true,
      data: formattedOrders,
      total: formattedOrders.length,
      message: formattedOrders.length > 0 
        ? `找到 ${formattedOrders.length} 筆訂單記錄` 
        : '沒有找到訂單記錄',
      searchInfo: {
        searchedPhone: phone,
        matchedFormat: userOrders.length > 0 ? '找到匹配的電話格式' : '無匹配格式'
      }
    };

  } catch (error) {
    console.error('查詢訂單錯誤:', error);
    return {
      success: false,
      message: '查詢訂單失敗',
      error: error.toString()
    };
  }
}

// 新增：電話號碼比對函數（處理多種格式）
function isPhoneMatch(storedPhone, searchPhone) {
  if (!storedPhone) return false;
  
  // 將電話轉換為字串並清理格式
  const stored = storedPhone.toString().trim();
  const search = searchPhone.toString().trim();
  
  console.log(`比對電話: 儲存="$${stored}", 查詢="$${search}"`);
  
  // 比對多種可能的格式
  const formats = [
    stored === search, // 完全匹配
    stored === search.replace(/^0/, ''), // 查詢有0，儲存沒有0
    stored === '0' + search, // 查詢沒有0，儲存有0
    stored.replace(/^0/, '') === search.replace(/^0/, ''), // 兩邊都去掉0後匹配
    stored === search.slice(1), // 查詢有0，儲存沒有0（去掉第一位）
    '0' + stored === search // 儲存沒有0，查詢有0
  ];
  
  const isMatch = formats.some(format => format === true);
  console.log(`比對結果: ${isMatch}`);
  
  return isMatch;
}

// 新增：格式化電話號碼用於儲存
function formatPhoneForStorage(phone) {
  if (!phone) return '';
  
  // 移除所有非數字字符
  const cleanPhone = phone.toString().replace(/\D/g, '');
  
  // 如果是09開頭的10位數字，保持原樣
  if (/^09\d{8}$/.test(cleanPhone)) {
    return cleanPhone;
  }
  
  // 如果是9開頭的9位數字，補上0
  if (/^9\d{8}$/.test(cleanPhone)) {
    return '0' + cleanPhone;
  }
  
  // 其他格式返回清理後的數字
  return cleanPhone;
}

// 新增：格式化電話號碼用於顯示
function formatPhoneForDisplay(phone) {
  if (!phone) return '';
  
  const cleanPhone = phone.toString().replace(/\D/g, '');
  
  // 如果是9開頭的9位數字，補上0
  if (/^9\d{8}$/.test(cleanPhone)) {
    return '0' + cleanPhone;
  }
  
  // 如果是09開頭的10位數字，保持原樣
  if (/^09\d{8}$/.test(cleanPhone)) {
    return cleanPhone;
  }
  
  // 其他格式返回原值
  return phone.toString();
}

// 新增：修復現有電話號碼格式
function fixPhoneNumbers() {
  try {
    const orderSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    
    if (orderSheet.getLastRow() <= 1) {
      return '沒有訂單資料需要修復';
    }
    
    const lastRow = orderSheet.getLastRow();
    const orders = orderSheet.getRange(2, 1, lastRow - 1, 14).getValues();
    
    let fixedCount = 0;
    const updates = [];
    
    orders.forEach((order, index) => {
      const originalPhone = order[2];
      const fixedPhone = formatPhoneForStorage(originalPhone);
      
      if (originalPhone !== fixedPhone) {
        order[2] = fixedPhone; // 更新電話號碼
        updates.push({
          row: index + 2, // +2 因為從第2行開始，且陣列從0開始
          original: originalPhone,
          fixed: fixedPhone
        });
        fixedCount++;
      }
    });
    
    // 批量更新
    if (updates.length > 0) {
      orderSheet.getRange(2, 1, orders.length, orders[0].length).setValues(orders);
      
      console.log(`已修復 ${fixedCount} 筆電話號碼格式:`);
      updates.forEach(update => {
        console.log(`第 ${update.row} 行: ${update.original} -> ${update.fixed}`);
      });
    }
    
    return `已修復 ${fixedCount} 筆電話號碼格式問題`;
    
  } catch (error) {
    return `修復電話號碼失敗: ${error.toString()}`;
  }
}

// 查詢歷史訂單（進階功能）
function handleGetOrderHistory(requestData) {
  try {
    const { phone, startDate, endDate, status } = requestData;
    
    if (!phone) {
      return {
        success: false,
        message: '請提供手機號碼'
      };
    }

    // 先取得所有訂單
    const allOrdersResult = handleGetOrders(requestData);
    
    if (!allOrdersResult.success) {
      return allOrdersResult;
    }

    let filteredOrders = allOrdersResult.data;

    // 按時間範圍過濾
    if (startDate) {
      const start = new Date(startDate);
      filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) <= end);
    }

    // 按狀態過濾
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    return {
      success: true,
      data: filteredOrders,
      total: filteredOrders.length,
      filters: {
        phone: phone,
        startDate: startDate,
        endDate: endDate,
        status: status
      },
      message: `找到 ${filteredOrders.length} 筆訂單記錄`
    };

  } catch (error) {
    console.error('查詢歷史訂單錯誤:', error);
    return {
      success: false,
      message: '查詢歷史訂單失敗',
      error: error.toString()
    };
  }
}

// 獲取菜單
function handleGetMenu() {
  try {
    const menuSheet = getSheetByName(CONFIG.SHEETS.MENU);
    
    if (menuSheet.getLastRow() <= 1) {
      // 如果沒有菜單，返回預設菜單
      const defaultMenu = [
        { name: '滷肉飯', price: 35, icon: '🍚', available: true },
        { name: '雞肉飯', price: 40, icon: '🍗', available: true },
        { name: '蚵仔煎', price: 65, icon: '🍳', available: true },
        { name: '大腸麵線', price: 50, icon: '🍜', available: true },
        { name: '珍珠奶茶', price: 45, icon: '🥤', available: true },
        { name: '鹽酥雞', price: 60, icon: '🍖', available: true },
        { name: '甜不辣', price: 40, icon: '🍢', available: true },
        { name: '肉圓', price: 45, icon: '🥟', available: true }
      ];
      
      return {
        success: true,
        data: defaultMenu,
        message: '使用預設菜單'
      };
    }

    const menuItems = menuSheet.getRange(2, 1, menuSheet.getLastRow() - 1, 4).getValues();
    const formattedMenu = menuItems.map(item => ({
      name: item[0],
      price: Number(item[1]),
      icon: item[2] || '🍽️',
      available: item[3] !== false && item[3] !== 'FALSE' && item[3] !== 0
    })).filter(item => item.available);

    return {
      success: true,
      data: formattedMenu
    };

  } catch (error) {
    return {
      success: false,
      message: '獲取菜單失敗',
      error: error.toString()
    };
  }
}

// 更新訂單狀態
function handleUpdateOrderStatus(requestData) {
  try {
    const { orderId, status, remarks = '' } = requestData;
    
    if (!orderId || !status) {
      return {
        success: false,
        message: '缺少必要參數'
      };
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        message: '無效的狀態值'
      };
    }

    const orderSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    
    if (orderSheet.getLastRow() <= 1) {
      return {
        success: false,
        message: '沒有訂單資料'
      };
    }

    const orders = orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 14).getValues();
    const orderIndex = orders.findIndex(order => order[0] === orderId);
    
    if (orderIndex === -1) {
      return {
        success: false,
        message: '訂單不存在'
      };
    }

    // 更新狀態 (第12列是狀態，索引11)
    orderSheet.getRange(orderIndex + 2, 12).setValue(status);
    
    // 更新備註 (第14列是備註，索引13)
    if (remarks) {
      orderSheet.getRange(orderIndex + 2, 14).setValue(remarks);
    }

    return {
      success: true,
      message: '訂單狀態更新成功',
      data: {
        orderId: orderId,
        newStatus: status
      }
    };

  } catch (error) {
    return {
      success: false,
      message: '更新訂單狀態失敗',
      error: error.toString()
    };
  }
}

// 獲取營業時間
function handleGetBusinessHours() {
  return {
    success: true,
    data: CONFIG.BUSINESS_HOURS
  };
}

// 輸入驗證
function validateOrderData(orderData) {
  if (!orderData.customerName || orderData.customerName.trim().length === 0) {
    return { isValid: false, message: '請填寫姓名' };
  }

  const phone = orderData.customerPhone;
  if (!phone || !/^(09\d{8}|9\d{8})$/.test(phone.replace(/\D/g, ''))) {
    return { isValid: false, message: '請填寫有效的手機號碼 (09開頭10位數字或9開頭9位數字)' };
  }

  if (!orderData.pickupTime) {
    return { isValid: false, message: '請選擇取餐時間' };
  }

  const pickupTime = new Date(orderData.pickupTime);
  if (pickupTime < new Date()) {
    return { isValid: false, message: '取餐時間不能是過去時間' };
  }

  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    return { isValid: false, message: '購物車是空的' };
  }

  const totalItems = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalItems > CONFIG.MAX_ITEMS_PER_ORDER) {
    return { isValid: false, message: `單筆訂單最多 ${CONFIG.MAX_ITEMS_PER_ORDER} 個品項` };
  }

  for (const item of orderData.items) {
    if (!item.name || !item.price || !item.quantity) {
      return { isValid: false, message: '購物車資料不完整' };
    }
    if (item.quantity <= 0) {
      return { isValid: false, message: '品項數量必須大於 0' };
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      return { isValid: false, message: '價格必須是有效的數字' };
    }
  }

  return { isValid: true, message: '驗證通過' };
}

// 檢查營業時間
function isWithinBusinessHours() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + currentMinute / 60;
  
  return currentTime >= CONFIG.BUSINESS_HOURS.start && currentTime < CONFIG.BUSINESS_HOURS.end;
}

// 檢查訂單頻率限制
function checkOrderRateLimit(phone) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const orderSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
  
  if (orderSheet.getLastRow() <= 1) {
    return { allowed: true };
  }

  const orders = orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 14).getValues();
  const recentOrders = orders.filter(order => {
    const orderTime = new Date(order[12]);
    return isPhoneMatch(order[2], phone) && orderTime > oneHourAgo;
  });

  if (recentOrders.length >= CONFIG.MAX_ORDERS_PER_HOUR) {
    const oldestOrder = recentOrders.reduce((oldest, current) => {
      return new Date(current[12]) < new Date(oldest[12]) ? current : oldest;
    });
    
    const oldestOrderTime = new Date(oldestOrder[12]);
    const elapsedMinutes = (Date.now() - oldestOrderTime.getTime()) / (60 * 1000);
    const waitMinutes = Math.ceil(60 - elapsedMinutes);
    
    return { 
      allowed: false, 
      waitMinutes: waitMinutes 
    };
  }

  return { allowed: true };
}

// 生成訂單ID
function generateOrderId() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORDER${timestamp}${random}`;
}

// 獲取狀態文字
function getStatusText(status) {
  const statusMap = {
    'pending': '待確認',
    'confirmed': '已確認',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
}

// 工具函數：獲取工作表
function getSheetByName(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    
    switch (name) {
      case CONFIG.SHEETS.ORDERS:
        // 訂單表頭 - 設定電話欄位為文字格式
        const orderHeaders = [
          '訂單ID', '客戶姓名', '手機號碼', 'LINE用戶ID', 
          '訂單項目', '小計', '外送費', '總金額', 
          '取餐時間', '外送地址', '備註', '狀態', 
          '創建時間', '管理備註'
        ];
        sheet.getRange(1, 1, 1, orderHeaders.length).setValues([orderHeaders]);
        
        // 設定電話欄位為文字格式，避免數字格式問題
        sheet.getRange("C:C").setNumberFormat("@");
        break;
        
      case CONFIG.SHEETS.MENU:
        // 菜單表頭
        sheet.getRange(1, 1, 1, 4).setValues([['品項名稱', '價格', '圖標', '是否供應']]);
        break;
        
      case CONFIG.SHEETS.SETTINGS:
        // 設定表頭
        sheet.getRange(1, 1, 1, 2).setValues([['設定項目', '設定值']]);
        break;
    }
    
    console.log(`創建新的工作表: ${name}`);
  }
  
  return sheet;
}

// 系統初始化
function initializeSystem() {
  console.log('開始初始化系統...');
  
  try {
    const ordersSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    const menuSheet = getSheetByName(CONFIG.SHEETS.MENU);
    const settingsSheet = getSheetByName(CONFIG.SHEETS.SETTINGS);
    
    // 初始化設定
    const settings = [
      ['營業時間開始', '10'],
      ['營業時間結束', '21'],
      ['外送費用', '30'],
      ['最大訂單品項', '10'],
      ['每小時最大訂單數', '3']
    ];
    
    if (settingsSheet.getLastRow() === 1) {
      settingsSheet.getRange(2, 1, settings.length, 2).setValues(settings);
    }
    
    // 初始化菜單
    if (menuSheet.getLastRow() === 1) {
      const defaultMenu = [
        ['滷肉飯', 35, '🍚', true],
        ['雞肉飯', 40, '🍗', true],
        ['蚵仔煎', 65, '🍳', true],
        ['大腸麵線', 50, '🍜', true],
        ['珍珠奶茶', 45, '🥤', true],
        ['鹽酥雞', 60, '🍖', true],
        ['甜不辣', 40, '🍢', true],
        ['肉圓', 45, '🥟', true]
      ];
      menuSheet.getRange(2, 1, defaultMenu.length, 4).setValues(defaultMenu);
    }
    
    console.log('系統初始化完成');
    return {
      success: true,
      message: '系統初始化完成',
      sheets: {
        orders: ordersSheet.getName(),
        menu: menuSheet.getName(),
        settings: settingsSheet.getName()
      }
    };
  } catch (error) {
    console.error('初始化失敗:', error);
    return {
      success: false,
      message: '系統初始化失敗',
      error: error.toString()
    };
  }
}

// 添加測試資料
function addTestData() {
  try {
    const orderSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    
    const testOrders = [
      [
        'TEST001',
        '王小明',
        '0936220535', // 正確格式
        'LINE123',
        JSON.stringify([
          { name: '滷肉飯', price: 35, quantity: 2, icon: '🍚' },
          { name: '珍珠奶茶', price: 45, quantity: 1, icon: '🥤' }
        ]),
        115,
        0,
        115,
        new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        '',
        '不要香菜',
        'completed',
        new Date().toISOString(),
        '測試資料'
      ],
      [
        'TEST002',
        '李小美',
        '936220535', // 缺少0的格式
        'LINE124',
        JSON.stringify([
          { name: '鹽酥雞', price: 60, quantity: 1, icon: '🍖' },
          { name: '甜不辣', price: 40, quantity: 1, icon: '🍢' }
        ]),
        100,
        30,
        130,
        new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        '台北市信義區測試路100號',
        '要辣',
        'confirmed',
        new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ''
      ]
    ];
    
    if (orderSheet.getLastRow() === 1) {
      orderSheet.getRange(2, 1, testOrders.length, testOrders[0].length).setValues(testOrders);
      return `成功添加 ${testOrders.length} 筆測試訂單（包含不同電話格式）`;
    } else {
      const existingCount = orderSheet.getLastRow() - 1;
      return `已有 ${existingCount} 筆訂單資料，未添加測試資料`;
    }
  } catch (error) {
    return `添加測試資料失敗: ${error.toString()}`;
  }
}

// 清除所有資料（僅用於測試）
function clearAllData() {
  try {
    const ordersSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    const menuSheet = getSheetByName(CONFIG.SHEETS.MENU);
    
    if (ordersSheet.getLastRow() > 1) {
      ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).clear();
    }
    
    if (menuSheet.getLastRow() > 1) {
      menuSheet.getRange(2, 1, menuSheet.getLastRow() - 1, menuSheet.getLastColumn()).clear();
    }
    
    return '所有資料已清除';
  } catch (error) {
    return `清除資料失敗: ${error.toString()}`;
  }
}

// 獲取系統狀態
function getSystemStatus() {
  try {
    const ordersSheet = getSheetByName(CONFIG.SHEETS.ORDERS);
    const menuSheet = getSheetByName(CONFIG.SHEETS.MENU);
    
    const orderCount = ordersSheet.getLastRow() - 1;
    const menuCount = menuSheet.getLastRow() - 1;
    
    return {
      success: true,
      data: {
        orders: orderCount,
        menuItems: menuCount,
        businessHours: CONFIG.BUSINESS_HOURS,
        deliveryFee: CONFIG.DELIVERY_FEE,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      message: '獲取系統狀態失敗',
      error: error.toString()
    };
  }
}
