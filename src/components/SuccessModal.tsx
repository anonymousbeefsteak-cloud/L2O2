/**
 * LINE訂餐機器人系統 - 無名牛排 (雙階段綁定)
 * 版本：7.1.1
 * 開發者：AI Assistant
 * 最後更新：2025/10/16
 * 功能：支持LINE follow事件捕獲用戶、訂單處理、LIFF訂餐
 * 修正：將模板字符串改為傳統字符串拼接，以提高在Google Apps Script環境中的兼容性，解決"Failed to fetch"問題。
 */

/**
 * Declare Google Apps Script global variables to resolve "Cannot find name" errors in a TypeScript environment.
 * These declarations ensure compatibility with Google Apps Script's runtime.
 */
declare var CacheService: any;
declare var UrlFetchApp: any;
declare var SpreadsheetApp: any;
declare var ContentService: any;

// ==================== 配置設定 ====================
var SCRIPT_CACHE = CacheService.getScriptCache();
var MENU_CACHE_KEY = 'menu_data';

var CONFIG = {
  restaurant: {
    name: "無名牛排",
    phone: "02-1234-5678",
    address: "臺北市信義區松壽路123號",
    openingHours: "10:00-22:00"
  },
  sheetId: "101phIlp8Eu9czR8rKnIBfv8c1wPVLftlva1eaAl3nCs", // Replace with your actual Google Sheet ID
  lineToken: "hJ/VCrwaX67qCzgw0GL+pZ4gYduAYrnPV3D9UtwnaKNXnEVYGpefCO1Lu2chiXLGWf+vSyn35bwq2rm2srj96L3r8UCXluH2PA/VV/ldKSjZo7a0rPo/4whRWlERB/1MoDqYQXqx4y9oaRhFA6xFoAdB04t89/1O/w1cDnyilFU="
  // Menu is fetched dynamically from the Google Sheet
};

// ==================== 工具函數 ====================
function generateOrderId() {
  var timestamp = new Date().getTime().toString().slice(-6);
  var randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return "ORD-" + timestamp + randomStr;
}

function logMessage(message, userId) {
  if (!userId) userId = "system";
  var timestamp = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  console.log("[" + timestamp + "] " + userId + ": " + message);
}

function formatPhone(phone) {
  if (!phone) return "";
  var phoneStr = phone.toString();
  if (phoneStr.startsWith("09") && phoneStr.length === 10) {
    return phoneStr.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1-$2-$3");
  }
  return phoneStr;
}

function getMenuItemById(id) {
  return getMenuItems().find(function(item) { return item.id === id; }) || null;
}

function validatePhone(phone) {
  if (!phone) return false;
  var phoneStr = phone.toString();
  return /^09\d{8}$/.test(phoneStr);
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/[<>]/g, '');
}

function getUserProfile(userId) {
  try {
    var options = {
      method: "get",
      headers: {
        "Authorization": "Bearer " + CONFIG.lineToken
      },
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch("https://api.line.me/v2/bot/profile/" + userId, options);
    if (response.getResponseCode() !== 200) {
      throw new Error("無法獲取用戶資料: " + response.getContentText());
    }
    return JSON.parse(response.getContentText());
  } catch (error) {
    logMessage("獲取用戶資料失敗: " + error.message, userId);
    return null;
  }
}

// ==================== 資料存儲 & 菜單管理 ====================
function getMenuItemsFromSheet() {
  try {
    var sheet = getSheet("menu");
    if (!sheet) throw new Error("無法獲取菜單工作表");
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    var menuItems = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var id = parseInt(row[0]);
      var name = row[1];
      var price = parseInt(row[2]);
      var category = row[3] || "";
      if (!isNaN(id) && name && !isNaN(price)) {
        menuItems.push({ id: id, name: name, price: price, category: category });
      }
    }
    return menuItems;
  } catch (error) {
    logMessage("讀取菜單工作表失敗: " + error.message, "system");
    return [];
  }
}

function getMenuItems() {
  var cached = SCRIPT_CACHE.get(MENU_CACHE_KEY);
  if (cached !== null) {
    return JSON.parse(cached);
  }
  var menu = getMenuItemsFromSheet();
  SCRIPT_CACHE.put(MENU_CACHE_KEY, JSON.stringify(menu), 600); // Cache for 10 minutes
  return menu;
}

function getSheet(name) {
  try {
    var spreadsheet = SpreadsheetApp.openById(CONFIG.sheetId);
    if (!spreadsheet) {
      throw new Error("無法打開指定的Google表單，請檢查sheetId是否正確");
    }
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      if (name === "orders") {
        sheet.appendRow([
          "訂單編號", "來源", "用戶ID", "LINE User ID", "顧客姓名", 
          "手機", "餐點內容", "總金額", "取餐時間", "備註", 
          "下單時間", "狀態"
        ]);
        var headerRange = sheet.getRange(1, 1, 1, 12);
        headerRange.setFontWeight("bold").setBackground("#f0f0f0");
      } else if (name === "users") {
        sheet.appendRow(["用戶ID", "顯示名稱", "手機", "綁定時間", "最後使用時間"]);
        var headerRange = sheet.getRange(1, 1, 1, 5);
        headerRange.setFontWeight("bold").setBackground("#f0f0f0");
      } else if (name === "menu") {
        sheet.appendRow(["編號", "名稱", "價格", "類別"]);
        var headerRange = sheet.getRange(1, 1, 1, 4);
        headerRange.setFontWeight("bold").setBackground("#f0f0f0");
        var initialMenu = [
          { id: 1, name: "經典沙朗牛排", price: 250, category: "主餐" },
          { id: 2, name: "特級菲力牛排", price: 320, category: "主餐" },
          { id: 3, name: "香煎雞腿排", price: 220, category: "主餐" },
          { id: 4, name: "酥炸鱈魚排", price: 230, category: "主餐" },
          { id: 5, name: "鐵板麵套餐", price: 150, category: "主餐" },
          { id: 6, name: "玉米濃湯", price: 40, category: "湯品" },
          { id: 7, name: "香蒜麵包", price: 30, category: "副餐" },
          { id: 8, name: "紅茶", price: 25, category: "飲料" }
        ];
        initialMenu.forEach(function(item) {
          sheet.appendRow([item.id, item.name, item.price, item.category]);
        });
      }
    }
    return sheet;
  } catch (error) {
    logMessage("獲取工作表失敗: " + error.message, "system");
    return null;
  }
}

function saveOrder(orderData) {
  try {
    var sheet = getSheet("orders");
    if (!sheet) {
      throw new Error("無法獲取訂單工作表");
    }
    var orderId = generateOrderId();
    var now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });

    var row = [
      orderId,
      orderData.source || "UNKNOWN",
      orderData.userId || "unknown",
      orderData.lineUserId || "",
      orderData.customerName || "",
      formatPhone(orderData.customerPhone) || "",
      orderData.items || "",
      orderData.total || 0,
      orderData.pickupTime || "",
      orderData.notes || "",
      now,
      "已確認"
    ];

    sheet.appendRow(row);
    logMessage("訂單保存成功: " + orderId, orderData.userId || "web");
    return { success: true, orderId: orderId };
  } catch (error) {
    logMessage("保存訂單失敗: " + error.message, orderData.userId || "web");
    return { success: false, error: error.message };
  }
}

function saveLineOrder(userId, phone, items, total, notes) {
  var orderData = {
    source: "LINE",
    userId: userId,
    customerPhone: phone,
    items: items,
    total: total,
    notes: notes
  };
  return saveOrder(orderData);
}

function saveUser(userId, displayName) {
  try {
    var sheet = getSheet("users");
    if (!sheet) {
      throw new Error("無法獲取用戶工作表");
    }
    var data = sheet.getDataRange().getValues();
    var now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      sheet.appendRow([userId, displayName || "未知用戶", "", now, now]);
      logMessage("新用戶添加成功: " + userId, userId);
    }
    return { success: true };
  } catch (error) {
    logMessage("保存用戶失敗: " + error.message, userId);
    return { success: false, error: error.message };
  }
}

function saveUserPhone(userId, phone) {
  try {
    var sheet = getSheet("users");
    if (!sheet) {
      throw new Error("無法獲取用戶工作表");
    }
    var data = sheet.getDataRange().getValues();
    var now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        rowIndex = i + 1;
        sheet.getRange(rowIndex, 3).setValue(phone);
        sheet.getRange(rowIndex, 4).setValue(now);
        sheet.getRange(rowIndex, 5).setValue(now);
        break;
      }
    }

    if (rowIndex === -1) {
      sheet.appendRow([userId, "未知用戶", phone, now, now]);
    }

    logMessage("用戶手機綁定成功: " + userId, userId);
    return { 
      success: true, 
      action: rowIndex === -1 ? "created" : "updated"
    };
  } catch (error) {
    logMessage("保存用戶手機失敗: " + error.message, userId);
    return { success: false, error: error.message };
  }
}

function getUserPhone(userId) {
  try {
    var sheet = getSheet("users");
    if (!sheet) {
      throw new Error("無法獲取用戶工作表");
    }
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        return data[i][2];
      }
    }
    return null;
  } catch (error) {
    logMessage("獲取用戶手機失敗: " + error.message, userId);
    return null;
  }
}

function updateUserLastUsed(userId) {
  try {
    var sheet = getSheet("users");
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.getRange(i + 1, 5).setValue(new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }));
        break;
      }
    }
  } catch (error) {
    logMessage("更新用戶最後使用時間失敗: " + error.message, userId);
  }
}

// ==================== LINE 服務 ====================
function replyToLine(replyToken, message) {
  try {
    if (!replyToken || replyToken === "TEST_TOKEN") {
      logMessage("缺少或測試replyToken，跳過回復", "system");
      return false;
    }
    if (message.length > 2000) {
      message = message.substring(0, 1997) + "...";
    }

    var payload = {
      replyToken: replyToken,
      messages: [{
        type: "text",
        text: message
      }]
    };

    var options = {
      method: "post",
      headers: {
        "Authorization": "Bearer " + CONFIG.lineToken,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options);
    var responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      throw new Error("LINE API 回應錯誤: " + responseCode + " - " + response.getContentText());
    }

    logMessage("回復成功: " + replyToken, "system");
    return true;
  } catch (error) {
    logMessage("回復失敗: " + error.message, "system");
    return false;
  }
}

// ==================== 命令處理 ====================
function handleMenu() {
  var menuData = getMenuItems();
  var menu = "📋 " + CONFIG.restaurant.name + " 菜單\n\n";
  var categories = {};
  menuData.forEach(function(item) {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });
  for (var category in categories) {
    menu += "【" + category + "】\n";
    categories[category].forEach(function(item) {
      menu += item.id + ". " + item.name + " - $" + item.price + "\n";
    });
    menu += "\n";
  }
  menu += "📝 訂餐格式：1 x2, 4 x1\n";
  menu += "💡 可加備註：1 x2 備註七分熟\n";
  menu += "⏰ 營業時間：" + CONFIG.restaurant.openingHours + "\n";
  menu += "🔗 立即訂餐：https://liff.line.me/2008276630-bYNjwMx7";
  return menu;
}

function handleOrder(orderText, userId) {
  try {
    if (!orderText || typeof orderText !== 'string') {
      logMessage("訂單文本無效或缺失", userId);
      return "❌ 訂單格式錯誤，請使用：1 x2, 4 x1\n或點擊：https://liff.line.me/2008276630-bYNjwMx7";
    }

    var userPhone = getUserPhone(userId);
    var items = [];
    var total = 0;
    var notes = "";

    var partsWithNotes = orderText.split('備註');
    if (partsWithNotes.length > 1) {
      orderText = partsWithNotes[0].trim();
      notes = sanitizeText(partsWithNotes[1]);
    }

    var parts = orderText.split(",");
    var hasValidItems = false;

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      
      var match = part.match(/(\d+)\s*x\s*(\d+)/i);
      
      if (match) {
        var itemId = parseInt(match[1]);
        var quantity = parseInt(match[2]);
        
        if (quantity <= 0 || isNaN(quantity)) {
          return "❌ 數量錯誤：" + part + "，數量必須大於0";
        }
        
        if (quantity > 20) {
          return "❌ 數量錯誤：" + part + "，單項數量不能超過20";
        }
        
        var menuItem = getMenuItemById(itemId);
        if (!menuItem) {
          return "❌ 未知的餐點編號：" + itemId;
        }
        
        var itemTotal = menuItem.price * quantity;
        total += itemTotal;
        items.push(menuItem.name + " x" + quantity + " - $" + itemTotal);
        hasValidItems = true;
      } else if (part && !part.includes('備註')) {
        return "❌ 訂單格式錯誤：" + part + "，請使用：1 x2\n或點擊：https://liff.line.me/2008276630-bYNjwMx7";
      }
    }

    if (!hasValidItems) {
      return "❌ 未找到有效訂單，請使用：1 x2, 4 x1\n或點擊：https://liff.line.me/2008276630-bYNjwMx7";
    }

    if (total <= 0) {
      return "❌ 訂單金額錯誤，請檢查訂單內容";
    }

    var saveResult = saveLineOrder(userId, userPhone, items.join(", "), total, notes);
    if (!saveResult.success) {
      return "❌ 訂單保存失敗，請稍後重試";
    }

    var response = "✅ 訂單已確認！\n\n";
    response += "🍽️ 訂單內容：\n" + items.join("\n") + "\n\n";
    response += "💵 總金額：$" + total + "\n";
    response += "🆔 訂單編號：" + saveResult.orderId + "\n";

    if (notes) {
      response += "📝 備註：" + notes + "\n";
    }

    response += "\n📍 " + CONFIG.restaurant.address + "\n";
    response += "📞 " + CONFIG.restaurant.phone + "\n";
    response += "⏰ " + CONFIG.restaurant.openingHours + "\n\n";

    if (!userPhone) {
      response += "⚠️ 請使用「綁定 0912345678」綁定手機，以便聯繫";
    } else {
      response += "📱 聯繫手機：" + formatPhone(userPhone);
    }

    return response;
  } catch (error) {
    logMessage("處理訂單失敗: " + error.message, userId);
    return "❌ 系統錯誤，請稍後重試";
  }
}

function handleBind(bindText, userId) {
  try {
    if (typeof bindText !== 'string') {
      return "❌ 綁定指令格式錯誤";
    }
    var phone = bindText.replace(/^綁定\s*/, "").trim();

    if (!phone) {
      return "❌ 請輸入手機號碼：\n綁定 0912345678";
    }

    phone = phone.replace(/[^\d]/g, "");

    if (!validatePhone(phone)) {
      return "❌ 手機格式錯誤，請使用：0912345678（10位數字）";
    }

    var saveResult = saveUserPhone(userId, phone);
    if (!saveResult.success) {
      return "❌ 綁定失敗，請稍後重試";
    }

    return "✅ 綁定成功！\n📱 手機號碼：" + formatPhone(phone) + "\n\n現在可以開始訂餐了！\n🔗 立即訂餐：https://liff.line.me/2008276630-bYNjwMx7";
  } catch (error) {
    logMessage("處理綁定失敗: " + error.message, userId);
    return "❌ 綁定失敗，請稍後重試";
  }
}

function handleStatus(userId) {
  try {
    var userPhone = getUserPhone(userId);
    var status = "👤 帳戶狀態\n\n";
    if (userPhone) {
      status += "📱 綁定手機：" + formatPhone(userPhone) + "\n";
      status += "✅ 手機狀態：已綁定\n";
    } else {
      status += "📱 手機狀態：未綁定\n";
      status += "💡 請使用「綁定 0912345678」綁定手機\n";
    }

    status += "\n📍 " + CONFIG.restaurant.address + "\n";
    status += "📞 " + CONFIG.restaurant.phone + "\n";
    status += "⏰ " + CONFIG.restaurant.openingHours + "\n";
    status += "🔗 立即訂餐：https://liff.line.me/2008276630-bYNjwMx7";
    return status;
  } catch (error) {
    logMessage("處理狀態查詢失敗: " + error.message, userId);
    return "❌ 查詢失敗，請稍後重試";
  }
}

function handleHelp() {
  var help = "🤖 " + CONFIG.restaurant.name + " 訂餐系統\n\n";
  help += "🍽️ 可用指令：\n\n";
  help += "• 「菜單」 - 查看完整菜單\n";
  help += "• 「1 x2, 4 x1」 - 下單訂餐\n";
  help += "• 「綁定 0912345678」 - 綁定手機號碼\n";
  help += "• 「狀態」 - 查看帳戶狀態\n";
  help += "• 「幫助」 - 顯示此說明\n\n";
  help += "📝 訂餐範例：\n";
  help += "1 x2, 3 x1, 5 x2\n";
  help += "1 x2 備註七分熟\n\n";
  help += "📍 " + CONFIG.restaurant.address + "\n";
  help += "📞 " + CONFIG.restaurant.phone + "\n";
  help += "⏰ " + CONFIG.restaurant.openingHours + "\n";
  help += "🔗 立即訂餐：https://liff.line.me/2008276630-bYNjwMx7";
  return help;
}

function handleFollow(userId, replyToken) {
  try {
    var profile = getUserProfile(userId);
    var displayName = profile ? profile.displayName : "未知用戶";
    var saveResult = saveUser(userId, displayName);
    if (!saveResult.success) {
      logMessage("處理follow事件失敗: " + saveResult.error, userId);
      return replyToLine(replyToken, "歡迎加入無名牛排！系統錯誤，請稍後嘗試訂餐：https://liff.line.me/2008276630-bYNjwMx7");
    }
    var welcomeMessage = "🎉 歡迎加入無名牛排！\n\n";
    welcomeMessage += "📋 立即查看菜單並訂餐：\n";
    welcomeMessage += "🔗 https://liff.line.me/2008276630-bYNjwMx7\n\n";
    welcomeMessage += "💡 輸入「幫助」查看更多指令";
    return replyToLine(replyToken, welcomeMessage);
  } catch (error) {
    logMessage("處理follow事件失敗: " + error.message, userId);
    return replyToLine(replyToken, "歡迎加入無名牛排！系統錯誤，請稍後嘗試訂餐：https://liff.line.me/2008276630-bYNjwMx7");
  }
}

// ==================== Web訂單處理 ====================
function handleWebOrder(orderData) {
  try {
    if (!orderData) {
      return { status: "error", message: "無效的訂單數據" };
    }
    if (!orderData.customerName || !orderData.customerPhone || !orderData.pickupTime) {
      return { status: "error", message: "請填寫所有必填字段（姓名、手機、取餐時間）" };
    }

    if (!validatePhone(orderData.customerPhone)) {
      return { status: "error", message: "手機號碼格式錯誤，請使用0912345678格式" };
    }

    if (!orderData.items || orderData.items.length === 0) {
      return { status: "error", message: "請至少選擇一項餐點" };
    }

    var items = [];
    var total = 0;

    orderData.items.forEach(function(item) {
      var menuItem = getMenuItemById(item.id);
      if (menuItem) {
        var itemTotal = menuItem.price * item.quantity;
        total += itemTotal;
        items.push(menuItem.name + " x" + item.quantity + " - $" + itemTotal);
      }
    });

    if (items.length === 0) {
      return { status: "error", message: "沒有有效的餐點項目" };
    }

    var webOrderData = {
      source: "WEB",
      userId: "web-" + orderData.customerPhone,
      lineUserId: orderData.customerLineUserId || "",
      customerName: sanitizeText(orderData.customerName),
      customerPhone: orderData.customerPhone,
      items: items.join(", "),
      total: total,
      pickupTime: new Date(orderData.pickupTime).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
      notes: sanitizeText(orderData.notes) || ""
    };

    var saveResult = saveOrder(webOrderData);
    if (!saveResult.success) {
      return { status: "error", message: "訂單保存失敗，請稍後再試" };
    }

    if (webOrderData.lineUserId) {
      saveUserPhone(webOrderData.lineUserId, webOrderData.customerPhone);
      updateUserLastUsed(webOrderData.lineUserId);
    }

    logMessage("網站訂單保存成功: " + saveResult.orderId, webOrderData.userId);
    return { 
      status: "success", 
      orderId: saveResult.orderId,
      total: total,
      message: "✅ 訂單提交成功！\n訂單編號：" + saveResult.orderId + "\n我們會盡快為您準備餐點！"
    };
  } catch (error) {
    logMessage("處理網站訂單失敗: " + error.message, orderData.userId || "web");
    return { status: "error", message: "系統錯誤，請稍後再試" };
  }
}

// ==================== 主處理函數 ====================
function doGet(e) {
  try {
    if (e.parameter.action === 'getMenu') {
      var menuItems = getMenuItems();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: menuItems }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: "無效的操作" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    logMessage("doGet Error: " + error.message, "system");
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: "伺服器錯誤" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Handle web order from LIFF app
    if (data.source === "web") {
      return ContentService.createTextOutput(
        JSON.stringify(handleWebOrder(data))
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Handle LINE bot events
    if (!data.events || !Array.isArray(data.events)) {
      logMessage("無效的LINE事件結構", "system");
      return ContentService.createTextOutput("無效請求").setMimeType(ContentService.MimeType.TEXT);
    }

    data.events.forEach(function(event) {
      var userId = event.source.userId || "unknown_user";
      var replyToken = event.replyToken;

      if (event.type === "follow") {
        handleFollow(userId, replyToken);
        return;
      }

      if (event.type !== "message" || event.message.type !== "text" || !event.message.text) {
        logMessage("收到非文本或無效消息", userId);
        replyToLine(replyToken, "❌ 請發送文字消息，例如「菜單」或「1 x2, 4 x1」\n或點擊：https://liff.line.me/2008276630-bYNjwMx7");
        return;
      }
      
      var messageText = sanitizeText(event.message.text);
      logMessage("收到訊息: " + messageText, userId);
      
      var response;
      var lowerText = messageText.toLowerCase();
      
      if (lowerText === "菜單" || lowerText === "menu" || lowerText === "m") {
        response = handleMenu();
      } else if (lowerText === "幫助" || lowerText === "help" || lowerText === "h" || lowerText === "?" || lowerText === "？") {
        response = handleHelp();
      } else if (lowerText.startsWith("綁定")) {
        response = handleBind(messageText, userId);
      } else if (lowerText === "狀態" || lowerText === "status") {
        response = handleStatus(userId);
      } else {
        response = handleOrder(messageText, userId);
      }
      
      replyToLine(replyToken, response);
      updateUserLastUsed(userId);
    });

    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    logMessage("處理請求失敗: " + error.message, "system");
    return ContentService.createTextOutput("系統錯誤").setMimeType(ContentService.MimeType.TEXT);
  }
}
