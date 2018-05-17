
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
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({    
  extended: false
}));
app.use(bodyParser.json());

http.createServer(app).listen(3119, function () {
  console.log('Listening on port 3119')
});

/*
 * 全局变量
 */
const WX_MSG_URL = 'http://2whzur.natappfree.cc';
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

var OAuth = require('wechat-oauth') 
var oauthApi = new OAuth(wx.appId, wx.appSecret, function (openid, callback) {
	  fs.readFile(__dirname+ '/token/'+ openid +'.token.txt', 'utf8', function (err, txt) {
			if (err) {return callback(err)}
			callback(null, JSON.parse(txt))
	  })
}, function (openid, token, callback) {
	  fs.writeFile(__dirname+ '/token/'+ openid + '.token.txt', JSON.stringify(token), callback)
})

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
app.get('/', function (req, res, next) {
  setTimeout(() => res.end('Hello Fire Alarm!'), Math.random() * 500);
});

/**
 * 微信网页入口
 */
app.get('/start', function (req, res, next) {
  var callbackURL = WX_MSG_URL + '/bind';
  var url = oauthApi.getAuthorizeURL(callbackURL,'state','snsapi_base');
  res.redirect(url);
});

/**
 * 绑定表单
 */
app.get('/bind', function (req, res, next) {
  var code = req.query.code 
  if(!code)  return res.sendStatus(401);
	
	oauthApi.getAccessToken(code, function (err, result) {
    //console.log('getAccessToken', err, result);
    if(err)  return next(err);
    let openid = result.data.openid;
    if(!openid)  return res.status(401).send('微信id获取错误！');
    
    // 查询用户绑定
    db.query(userSql.getUserByOpenid, [openid], function (err, users) {
      //console.log('users:', err, users);
			if(err) return next(err);
      let bound = (users.length > 0);
      let mobile = bound? users[0].mobile: '';
      
      res.render('bind', {bound, mobile, openid});
    });
    
  });
});

/**
 * 绑定表单(提交)
 */
app.post('/bind', function (req, res, next) {
  let tobind = (req.body.tobind == 'true');
  let mobile = (req.body.mobile || '').trim();
  let captcha = (req.body.captcha || '').trim();
  let openid = (req.body.openid || '').trim();
  console.log('tobind & mobile & captcha:', tobind, mobile, captcha);
  
  // TODO: VALID captcha + mobile + openid
  if(!/(^(13\d|15[^4,\D]|17[13678]|18\d)\d{8}|170[^346,\D]\d{7})$/.test(mobile)) {
    let err = '手机号格式错误';
    res.redirect('/result?ok=0&err='+err);
  }
  
  if(tobind) {
    db.query(userSql.getUserByMobile, [mobile], function (err, results) {
      //console.log('results', err, results);
      if(err) return next(err);
      if(results.length > 0) {
        let error = '该手机号已被绑定过';
        res.redirect('/result?ok=0&err='+error);
      }
      else {
        db.query(userSql.create, [mobile, openid], function (err, okPacket) {
          //console.log('okPacket', err, okPacket);
          if(err) return next(err);
          if( okPacket.affectedRows == 1) {
            res.redirect('/result?ok=1');
          }
          else {
            let error = '数据库插入错误';
            res.redirect('/result?ok=0&err='+error);
          }
        });
      }
    });
  }
  else {
    db.query(userSql.delUserByMobile, [mobile], function (err, okPacket) {
      //console.log('okPacket', err, okPacket);
      if(err) return next(err);
      if( okPacket.affectedRows == 1) {
        res.redirect('/result?ok=1');
      }
      else {
        let error = '数据库删除错误';
        res.redirect('/result?ok=0&err='+error);
      }
    });
  }
});

app.get('/result', function (req, res, next) {
  let ok = req.query.ok > 0? true: false;
  let err = req.query.err || '未知错误';
  res.render('result', {ok, err});
});

/**
 * 发送报警对外 API 接口
 */
app.post('/firealarm', function (req, res, next) {
  let token = (req.body.token || '').trim();
  let mobile = (req.body.mobile || '').trim();
  console.log('token & mobile:', token, mobile);
  
  let alarm = {};
  alarm.store = req.body.store || '默认1店';
  alarm.device = req.body.device || '默认设备';
  alarm.status = req.body.status || '默认参数超标！';
  
  // 验证 token 正确
  if( !token) {
    res.sendStatus(401);
  }
  
  if( !mobile) {
    res.sendStatus(500);
  }
  
  // 处理批量手机号码
  //mobile = '13011112222';
  let mobiles = mobile.split(',');
  let dry_mobs = mobiles.map( (m) => {
    return m.trim();
  });
  console.log('dry_mobs', dry_mobs);
  
  // 查询并发送报警
  db.query(userSql.getUsersByMobile, [dry_mobs], function (err, results) {
      //console.log('users:', err, results);
			if(err) return	next(err);
      sendAlarm(alarm, results);
      
      res.send('success!');
  });
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
