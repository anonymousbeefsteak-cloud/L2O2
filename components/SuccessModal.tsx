// Fix: Add type declarations for Google Apps Script global objects to resolve "Cannot find name" errors.
declare var SpreadsheetApp: any;
declare var UrlFetchApp: any;
declare var ContentService: any;

/**
 * LINE訂餐機器人系統 - 雙重綁定專業版
 * 版本：8.1.0
 * 開發者：AI Assistant
 * 最後更新：2025/10/16
 * 功能：實現用戶首次關注綁定與LIFF下單時的二次資料綁定，並同步前後端菜單為台灣小吃。
 */

// ==================== 配置設定 ====================
var CONFIG = {
  restaurant: {
    name: "台灣小吃店",
    phone: "02-1234-5678",
    address: "臺北市信義區松壽路123號",
    openingHours: "10:00 - 22:00"
  },
  sheetId: "101phIlp8Eu9czR8rKnIBfv8c1wPVLftlva1eaAl3nCs", // 請確認此ID是否正確
  lineToken: "hJ/VCrwaX67qCzgw0GL+pZ4gYduAYrnPV3D9UtwnaKNXnEVYGpefCO1Lu2chiXLGWf+vSyn35bwq2rm2srj96L3r8UCXluH2PA/VV/ldKSjZo7a0rPo/4whRWlERB/1MoDqYQXqx4y9oaRhFA6xFoAdB04t89/1O/w1cDnyilFU=",
  menu: [
    { id: 1, name: "滷肉飯", price: 35, category: "主食" },
    { id: 2, name: "雞肉飯", price: 40, category: "主食" },
    { id: 3, name: "蚵仔煎", price: 65, category: "小吃" },
    { id: 4, name: "大腸麵線", price: 50, category: "湯類" },
    { id: 5, name: "珍珠奶茶", price: 45, category: "飲料" },
    { id: 6, name: "鹽酥雞", price: 60, category: "小吃" },
    { id: 7, name: "甜不辣", price: 40, category: "小吃" },
    { id: 8, name: "蚵仔酥", price: 70, category: "小吃" },
    { id: 9, name: "肉圓", price: 45, category: "小吃" },
    { id: 10, name: "碗粿", price: 35, category: "主食" }
  ]
};

// ==================== 工具函數 ====================
function generateOrderId() {
  var timestamp = new Date().getTime().toString().slice(-6);
  var randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return "WEB-" + timestamp + randomStr;
}

function logMessage(message, userId) {
  var timestamp = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  console.log("[" + timestamp + "] " + (userId || "system") + ": " + message);
}

function formatPhone(phone) {
  var phoneStr = (phone || "").toString();
  return phoneStr.startsWith("09") && phoneStr.length === 10 ? phoneStr.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1-$2-$3") : phoneStr;
}

function getMenuItemById(id) {
  return CONFIG.menu.find(item => item.id === id) || null;
}

function validatePhone(phone) {
  return /^09\d{8}$/.test((phone || "").toString());
}

function sanitizeText(text) {
  return typeof text === 'string' ? text.trim().replace(/[<>]/g, '') : '';
}

function getCurrentTimestamp() {
  return new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

// ==================== 資料庫 (Google Sheets) ====================
function getSheet(name) {
  try {
    var spreadsheet = SpreadsheetApp.openById(CONFIG.sheetId);
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      var headers = [];
      if (name === "orders") {
        headers = ["訂單編號", "來源", "LINE User ID", "顧客姓名", "手機", "餐點內容", "總金額", "取餐時間", "備註", "下單時間", "狀態"];
      } else if (name === "users") {
        headers = ["LINE User ID", "Display Name", "手機", "首次加入時間", "最後互動時間"];
      } else if (name === "menu") {
        headers = ["編號", "名稱", "價格", "類別"];
        CONFIG.menu.forEach(item => sheet.appendRow([item.id, item.name, item.price, item.category]));
      }
      if (headers.length > 0) {
        sheet.appendRow(headers).getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f0f0f0");
      }
    }
    return sheet;
  } catch (error) {
    // Fix: Pass undefined for the missing second argument to satisfy the function signature.
    logMessage("獲取工作表失敗: " + error.message, undefined);
    return null;
  }
}

// ==================== 使用者管理 (核心綁定邏輯) ====================
function findOrCreateUser(userId, displayName) {
  try {
    var sheet = getSheet("users");
    if (!sheet) return;
    
    var data = sheet.getDataRange().getValues();
    var now = getCurrentTimestamp();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        // User found, update last interaction time and display name if provided
        sheet.getRange(i + 1, 5).setValue(now);
        if (displayName && data[i][1] !== displayName) {
          sheet.getRange(i + 1, 2).setValue(displayName);
        }
        return;
      }
    }
    
    // User not found, create new entry
    sheet.appendRow([userId, displayName || "", "", now, now]);
    logMessage("新用戶已建立: " + (displayName || userId), userId);
  } catch (error) {
    logMessage("尋找或建立用戶失敗: " + error.message, userId);
  }
}

function updateUserPhone(userId, phone) {
  if (!userId || !validatePhone(phone)) return;
  try {
    var sheet = getSheet("users");
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.getRange(i + 1, 3).setValue(phone);
        logMessage("用戶手機已更新", userId);
        return;
      }
    }
  } catch (error) {
    logMessage("更新用戶手機失敗: " + error.message, userId);
  }
}

function getUser(userId) {
  try {
    var sheet = getSheet("users");
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        return { userId: data[i][0], displayName: data[i][1], phone: data[i][2] };
      }
    }
    return null;
  } catch (error) {
    logMessage("獲取用戶資料失敗: " + error.message, userId);
    return null;
  }
}

// ==================== LINE API 服務 ====================
function replyToLine(replyToken, message) {
  if (!replyToken || replyToken.startsWith("TEST")) return;
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: { "Authorization": "Bearer " + CONFIG.lineToken, "Content-Type": "application/json" },
      payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: "text", text: message.substring(0, 5000) }] }),
      muteHttpExceptions: true
    });
  } catch (error) {
    // Fix: Pass undefined for the missing second argument to satisfy the function signature.
    logMessage("LINE回復失敗: " + error.message, undefined);
  }
}

function getLineProfile(userId) {
  try {
    var response = UrlFetchApp.fetch("https://api.line.me/v2/bot/profile/" + userId, {
      headers: { "Authorization": "Bearer " + CONFIG.lineToken },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    }
    return null;
  } catch (error) {
    logMessage("獲取LINE Profile失敗: " + error.message, userId);
    return null;
  }
}

// ==================== 訂單處理 ====================
function saveOrder(orderData) {
  try {
    var sheet = getSheet("orders");
    if (!sheet) throw new Error("無法獲取訂單工作表");
    
    var orderId = generateOrderId();
    var now = getCurrentTimestamp();
    
    var row = [
      orderId,
      orderData.source || "UNKNOWN",
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
    logMessage("訂單保存成功: " + orderId, orderData.lineUserId || "web");
    return { success: true, orderId: orderId };
  } catch (error) {
    logMessage("保存訂單失敗: " + error.message, orderData.lineUserId || "web");
    return { success: false, error: error.message };
  }
}

// ==================== Web (LIFF) 訂單處理 ====================
function handleWebOrder(data) {
  try {
    if (!data.customerName || !data.customerPhone || !data.pickupTime) {
      return { status: "error", message: "請填寫所有必填欄位(姓名、手機、取餐時間)" };
    }
    if (!validatePhone(data.customerPhone)) {
      return { status: "error", message: "手機號碼格式錯誤，請使用10位數字的09開頭號碼" };
    }
    if (!data.items || data.items.length === 0) {
      return { status: "error", message: "購物車是空的，請至少選擇一項餐點" };
    }

    var itemsText = [];
    var total = 0;
    data.items.forEach(function(item) {
      var menuItem = getMenuItemById(item.id);
      if (menuItem) {
        var itemTotal = menuItem.price * item.quantity;
        total += itemTotal;
        itemsText.push(`${menuItem.name} x${item.quantity}`);
      }
    });

    if (itemsText.length === 0) {
      return { status: "error", message: "訂單中沒有有效的餐點項目" };
    }

    // 2nd Binding: Update user profile with phone number from order
    if (data.customerLineUserId) {
      findOrCreateUser(data.customerLineUserId, data.customerName);
      updateUserPhone(data.customerLineUserId, data.customerPhone);
    }

    var saveResult = saveOrder({
      source: "WEB",
      lineUserId: data.customerLineUserId,
      customerName: sanitizeText(data.customerName),
      customerPhone: data.customerPhone,
      items: itemsText.join(", "),
      total: total,
      pickupTime: new Date(data.pickupTime).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
      notes: sanitizeText(data.notes)
    });

    if (!saveResult.success) {
      return { status: "error", message: "系統忙碌中，訂單儲存失敗，請稍後再試。" };
    }

    return { status: "success", orderId: saveResult.orderId };
  } catch (error) {
    // Fix: Pass undefined for the missing second argument to satisfy the function signature.
    logMessage("處理網站訂單失敗: " + error.message, undefined);
    return { status: "error", message: "發生未預期的錯誤，請聯繫客服。" };
  }
}

// ==================== LINE Bot 命令處理 ====================
function handleMenu() {
  var menu = "📋 " + CONFIG.restaurant.name + " 菜單\n\n";
  var categories = CONFIG.menu.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});
  
  for (var category in categories) {
    menu += "【" + category + "】\n";
    categories[category].forEach(item => menu += `${item.id}. ${item.name} - $${item.price}\n`);
    menu += "\n";
  }
  
  menu += "📝 訂餐格式：[編號] x[數量]\n範例：1 x2, 2 x1\n";
  menu += "💡 可加備註：1 x2 備註不要辣";
  return menu;
}

function handleOrder(orderText, userId) {
  if (!orderText || typeof orderText !== 'string') {
    return "❌ 訂單格式錯誤，請參考「菜單」說明。";
  }
  
  var user = getUser(userId);
  if (!user || !user.phone) {
    return "⚠️ 請先綁定手機才能訂餐！\n請輸入：綁定 0912345678";
  }

  var notes = "";
  if (orderText.includes('備註')) {
    var parts = orderText.split('備註');
    orderText = parts[0].trim();
    notes = sanitizeText(parts[1]);
  }
  
  var items = [];
  var total = 0;
  var hasValidItems = false;
  var itemParts = orderText.split(/[,，]/);

  for (var i = 0; i < itemParts.length; i++) {
    var match = itemParts[i].trim().match(/(\d+)\s*[xX]\s*(\d+)/);
    if (match) {
      var menuItem = getMenuItemById(parseInt(match[1]));
      var quantity = parseInt(match[2]);
      if (menuItem && quantity > 0 && quantity <= 20) {
        var itemTotal = menuItem.price * quantity;
        total += itemTotal;
        items.push(`${menuItem.name} x${quantity}`);
        hasValidItems = true;
      } else {
        return `❌ 無效的項目：${itemParts[i].trim()}`;
      }
    }
  }

  if (!hasValidItems) return "❌ 找不到有效的餐點項目，請檢查您的訂單。";

  var saveResult = saveOrder({
    source: "LINE",
    lineUserId: userId,
    customerName: user.displayName,
    customerPhone: user.phone,
    items: items.join(", "),
    total: total,
    notes: notes,
    pickupTime: "盡快準備"
  });

  if (!saveResult.success) return "❌ 系統錯誤，訂單儲存失敗。";

  var response = `✅ 訂單已確認！\n\n🆔 訂單編號：${saveResult.orderId}\n\n`;
  response += "🍽️ 內容：\n" + items.join("\n") + "\n\n";
  response += `💵 總金額：$${total}\n`;
  if (notes) response += `📝 備註：${notes}\n`;
  response += `📱 聯絡手機：${formatPhone(user.phone)}\n\n`;
  response += `我們會盡快為您準備，感謝您的訂購！`;
  return response;
}

function handleBind(bindText, userId) {
  var phone = sanitizeText(bindText).replace(/^綁定\s*/, "");
  if (!validatePhone(phone)) {
    return "❌ 手機格式錯誤，請輸入：綁定 0912345678";
  }
  updateUserPhone(userId, phone);
  return `✅ 綁定成功！\n您的手機號碼已更新為：${formatPhone(phone)}`;
}

function handleStatus(userId) {
  var user = getUser(userId);
  var status = `👤 ${user.displayName || '用戶'} 您好\n\n`;
  status += user && user.phone ? `📱 綁定手機：${formatPhone(user.phone)}` : "📱 手機狀態：尚未綁定";
  return status;
}

function handleHelp() {
  return `🤖 ${CONFIG.restaurant.name} 訂餐幫手\n\n` +
    "【主要指令】\n" +
    "• 「菜單」- 查看所有餐點\n" +
    "• 「1 x2, 2 x1」- 直接點餐\n" +
    "• 「綁定 0912345678」- 綁定手機\n" +
    "• 「狀態」- 查看您的綁定狀態\n\n" +
    `📍 ${CONFIG.restaurant.address}\n` +
    `📞 ${CONFIG.restaurant.phone}`;
}

// ==================== 主處理函數 (Webhook) ====================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // 處理 Web App (LIFF) 訂單
    if (data.source === "web") {
      var result = handleWebOrder(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 處理 LINE Webhook Events
    if (!data.events) { return; }

    data.events.forEach(function(event) {
      var userId = event.source.userId;
      var replyToken = event.replyToken;
      
      // 1st Binding: 新好友加入
      if (event.type === 'follow') {
        var profile = getLineProfile(userId);
        findOrCreateUser(userId, profile ? profile.displayName : "");
        replyToLine(replyToken, `👋 歡迎加入「${CONFIG.restaurant.name}」！\n輸入「菜單」查看我們提供的美味餐點吧！`);
      }
      // 處理文字訊息
      else if (event.type === 'message' && event.message.type === 'text') {
        // Fix: Pass undefined for the missing second argument to satisfy the function signature.
        findOrCreateUser(userId, undefined); // 更新最後互動時間
        var text = sanitizeText(event.message.text);
        var response;
        if (text === "菜單" || text.toLowerCase() === "menu") response = handleMenu();
        else if (text === "幫助" || text.toLowerCase() === "help") response = handleHelp();
        else if (text === "狀態" || text.toLowerCase() === "status") response = handleStatus(userId);
        else if (text.startsWith("綁定")) response = handleBind(text, userId);
        else response = handleOrder(text, userId);
        
        replyToLine(replyToken, response);
      }
    });
  } catch (error) {
    // Fix: Pass undefined for the missing second argument to satisfy the function signature.
    logMessage("doPost 發生嚴重錯誤: " + error.message, undefined);
  } finally {
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
