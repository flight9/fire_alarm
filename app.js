
const express = require('express')
const http = require('http')
const os = require('os')
const path = require('path');
const bodyParser = require('body-parser');

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({    
  extended: false
}));

http.createServer(app).listen(3119, function () {
  console.log('Listening on port 3119')
});

const WX_MSG_URL = '';

var users = require('./users');

/**
 * 微信 API 初始化
 */
let wx = require('./wxconfig');
let appId = wx.appId; 
let appSecret = wx.appSecret;
var WechatAPI = require('wechat-api')
var fs = require('fs')
var wechatApi = new WechatAPI(appId, appSecret, function (callback) {
  fs.readFile('access_token.txt', 'utf8', function (err, txt) {
    if (err) {return callback(null, null)} 
    callback(null, JSON.parse(txt))
  })
}, function (token, callback) {
  fs.writeFile('access_token.txt', JSON.stringify(token), callback)
});

/**
 * 发送报警 
 */
function sendAlarm(alarm, users) {
  let curtime = new Date().toLocaleString();
  console.error('SendAlarm', curtime);
  
  users.forEach( function(user) {
    if(!user.openid)  return;
    
    var templateId = 'RPmErW1apaSAmAy9oyTF0bM27-b4iKPCmpUHCICkH6E';
    var url = WX_MSG_URL;
    var data = {
      "first":{
       "value": '报警内容',
       "color": "#173177"
       },
       "keyword1":{
       "value": alarm.store,
       "color": "#173177"
       },
       "keyword2": {
       "value": alarm.device,
       "color": "#173177"
       },
       "keyword3": {
       "value": alarm.status,
       "color":"#173177"
       },
       "remark":{
       "value": '请关注！',
       "color":"#173177"
       }
    };
    wechatApi.sendTemplate(user.openid, templateId, url, data, function(err, result) {
      //console.log('sendTemplate err+result:', err, result)
    })
  });
}

// -- routers ------------------------------------------------------
app.get('/', function (req, res) {
  setTimeout(() => res.end('Hello Fire Alarm!'), Math.random() * 500);
})

app.get('/firealarm', function (req, res) {
  let token = (req.body.token || '').trim();
  let mobile = (req.body.mobile || '').trim();
  let store = req.body.store || '默认1店';
  let device = req.body.device || '默认设备';
  let status = req.body.status || '默认参数超标！';
  
  if( false) {
    res.sendStatus(400);
  }
  
  mobile = '139,159,179';
  let mobiles = mobile.split(',');
  console.log(mobiles);
  mobiles.forEach( (m) => {
    m = m.trim();
  });
  
  res.send('done!');
});

app.get('/test', function (req, res) {
  let alarm = {
    store: '闵行1店',
    device: '压缩机',
    status: '压力报警',
  };
  sendAlarm(alarm, users);
  res.send('test');
});

