
const express = require('express')
const http = require('http')
const os = require('os')
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');

// setup Mysql
var config = require('./db/config');
var userSql = require('./db/user_sql');
var db = mysql.createConnection(config.mysql);

const app = express();

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

/**
 * 发送报警对外 API 接口
 */
app.get('/firealarm', function (req, res, next) {
  let token = (req.body.token || '').trim();
  let mobile = (req.body.mobile || '').trim();
  
  let alarm = {};
  alarm.store = req.body.store || '默认1店';
  alarm.device = req.body.device || '默认设备';
  alarm.status = req.body.status || '默认参数超标！';
  
  // 验证 token 正确
  token = '20180516';
  if( token != '20180516') {
    res.sendStatus(401);
  }
  
  // 处理批量手机号码
  mobile = '13011112222,13072168298';
  let mobiles = mobile.split(',');
  let new_mobs = mobiles.map( (m) => {
    return m.trim();
  });
  console.log('new_mobs', new_mobs);
  
  // 查询并发送报警
  db.query(userSql.getUsersByMobile, [new_mobs], function (err, results) {
			if(err) return	next(err);
      console.log('users:', err, results);
      sendAlarm(alarm, results);
  });
  
  res.send('success!');
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

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
