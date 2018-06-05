
const express = require('express')
const http = require('http')
const os = require('os')
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const SMSClient = require('@alicloud/sms-sdk');
const schedule = require('node-schedule');
const {promisify} = require('util');

// setup Mysql
var config = require('./db/config');
var fireUsers = require('./db/fire_users');
var captchaSql = require('./db/captcha_sql');
var db = mysql.createPool(config.mysql);

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

/**
 * 全局变量 Global Variables
 */
//oW6aH0fY6upkzy6H9OA70WC3pclI (lmm)
const WX_MSG_URL = 'http://weixin.qq.com';
const MAX_SMS_COUNT = 10;
var users = require('./users');

// ALI smsClient
const ali = require('./aliconfig');
const accessKeyId = ali.AccessKeyID;
const secretAccessKey = ali.AccessKeySecret;
const smsClient = new SMSClient({accessKeyId, secretAccessKey});

/**
 * 定时清理 Schedule of clean
 */
var j = schedule.scheduleJob('5 2 * * *', function(){
  console.log('Schedule run at', new Date().toLocaleString(), '-----------');
  db.query(captchaSql.delExpire, [], function (err, results) {
    console.log('DelExpire', err, results);
  });
});

/**
 * 微信 API 初始化 Setup Wechat API
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
 * 定义 Promise.each() 方法
 */
Promise.each = async function(arr, fn) { // take an array and a function
   for(const item of arr) await fn(item);
}

/**
 * 发送报警 Send Alarm
 */
function sendAlarm(alarm, users) {
  let curtime = new Date().toLocaleString();
  console.error('SendAlarm', curtime, alarm.type, '--------------------');
  
  const sendTemplatePro = promisify(wechatApi.sendTemplate).bind(wechatApi);
  
  Promise.each(users, user => {
    if(!user.openid)  return Promise.resolve(null);
    return sendTemplatePro(
      user.openid, 
      alarm.templateId, 
      alarm.url, 
      alarm.data).then(result => {
        console.log('Send', user.mobile, result);
      }).catch(err => {
        console.log('Send', user.mobile, 'err', err);
      });
  });
  
}

/**
 * 验证手机号码格式 Verify Mobile
 */
function validMobile(number) {
  if(!number) return false;
  return (/(^(13\d|15[^4,\D]|17[13678]|18\d)\d{8}|170[^346,\D]\d{7})$/.test(number));
}

/**
 * 计算随机验证码 Make Captcha
 */
function random(len) {
  len = len || 4;
  var num = "";
  for (i = 0; i < len; i++) {
    num = num + Math.floor(Math.random() * 10);
  }
  return num;
}

// -- routers ------------------------------------------------------
app.get('/', function (req, res, next) {
  setTimeout(() => res.end('Hello Fire Alarm!'), Math.random() * 500);
});

/**
 * 微信网页入口 Wechat Entrance
 */
app.get('/fire/start', function (req, res, next) {
  var callbackURL = wx.webUrl + '/fire/bind';
  var url = oauthApi.getAuthorizeURL(callbackURL,'state','snsapi_base');
  res.redirect(url);
});

/**
 * 绑定表单 Bind Form
 */
app.get('/fire/bind', function (req, res, next) {
  var code = req.query.code;
  if(!code)  return res.sendStatus(401);
	
	oauthApi.getAccessToken(code, function (err, result) {
    //console.log('getAccessToken', err, result);
    if(err)  return next(err);
    let openid = result.data.openid;
    if(!openid)  return res.status(401).send('微信id获取错误！');
    
    // 查询用户绑定
    db.query(fireUsers.getUserByOpenid, [openid], function (err, users) {
      //console.log('users:', err, users);
			if(err) return next(err);
      let bound = (users.length > 0);
      let mobile = bound? users[0].mobile: '';
      
      res.render('bind', {bound, mobile, openid});
    });
    
  });
});

/**
 * 绑定表单(提交) Bind Form Submit
 */
app.post('/fire/bind', function (req, res, next) {
  let tobind = (req.body.tobind == 'true');
  let mobile = (req.body.mobile || '').trim();
  let captcha = (req.body.captcha || '').trim();
  let openid = (req.body.openid || '').trim();
  //console.log('tobind & mobile & captcha:', tobind, mobile, captcha);
  
  // VALID mobile + openid
  if(!validMobile(mobile)) {
    let error = '手机号格式错误';
    return res.redirect('/result?ok=0&err='+error);
  }
  else if(!openid || !captcha) {
    let error = '微信id丢失或没有验证码';
    return res.redirect('/result?ok=0&err='+error);
  }
  
  // VALID captcha
  db.query(captchaSql.getByMobile, [mobile], function (err, results) {
    // console.log('results', err, results);
    if(err) return next(err);    
    if(!results.length || results[0].captcha != captcha) {
      let error = '验证码无效';
      return res.redirect('/result?ok=0&err='+error);
    }
    
    let is_expire = (new Date(results[0].expire*1000)) < (new Date());
    if( is_expire) {
      let error = '验证码过期';
      return res.redirect('/result?ok=0&err='+error);
    }
    
    // Bind or Unbind
    if(tobind) {
      db.query(fireUsers.getUserByMobile, [mobile], function (err, results) {
        //console.log('results', err, results);
        if(err) return next(err);
        if(results.length > 0) {
          let error = '该手机号已被绑定过';
          res.redirect('/result?ok=0&err='+error);
        }
        else {
          db.query(fireUsers.create, [mobile, openid], function (err, okPacket) {
            //console.log('okPacket', err, okPacket);
            if(err) return next(err);
            if( okPacket.affectedRows == 1) {
              console.log('Bind mobile: '+ mobile);
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
      db.query(fireUsers.delUserByMobile, [mobile], function (err, okPacket) {
        //console.log('okPacket', err, okPacket);
        if(err) return next(err);
        if( okPacket.affectedRows == 1) {
          console.log('Unbind mobile: '+ mobile);
          res.redirect('/result?ok=1');
        }
        else {
          let error = '数据库删除错误';
          res.redirect('/result?ok=0&err='+error);
        }
      });
    }
    
  });
  
  return;
});

/**
 * 操作结果 Result Page
 */
app.get('/result', function (req, res, next) {
  let ok = req.query.ok > 0? true: false;
  let err = req.query.err || '未知错误';
  res.render('result', {ok, err});
});

/**
 * 发送验证码 Send SMS Captcha
 */
app.post('/sendsms', function (req, res, next) {
  let mobile = (req.body.mobile || '').trim();
  if(!validMobile(mobile)) {
    return res.json({err:101, msg:'手机号码格式错误'});
  }
  
  db.query(captchaSql.getByMobile, [mobile], function (err, results) {
    //console.log('results', err, results);
    if(err) return next(err);
    
    // 限制条数
    let expire = parseInt(new Date().getTime()/1000) + 5*60;
    let captcha = random(4); //'1234'
    let count = (!results.length)? 0: results[0].count;
    console.log('sms', mobile, 'count', count);
    if( ++count > MAX_SMS_COUNT) {
      return res.json({err:102, msg:'短消息发送次数过多'});
    }
    
    // 短信发送
    smsClient.sendSMS({
      PhoneNumbers: mobile,
      SignName: '倍省提醒',
      TemplateCode: 'SMS_135026027',
      TemplateParam: '{"code":"'+ captcha +'"}'
    }).then(function (result) {
      //console.log('sendSMS res:', result);
      let {Code}=result;
      if (Code === 'OK') {
        res.json({err:0, msg:'ok'});
      }
      
      // 插入更新db
      db.query(captchaSql.upsert, [mobile,captcha,expire,captcha,expire,count], function (err, results) {
        //console.log('results', err, results);
        if(err) return next(err);
      });
    }).catch(function (err) {
      console.log('sendSMS err:', err);
      res.json({err:err.data.Code, msg:err.data.Message});
    });

  });
  
});

/**
 * 消防报警对外 API 接口 Firealarm API
 */
app.post('/fire/alarm', function (req, res, next) {
  let token = (req.body.token || '').trim();
  let mobile = (req.body.mobile || '').trim();
  console.log('Recv mobiles:', mobile);
    
  // 验证 token 正确
  if( token != '20180516') {
    return res.sendStatus(401);
  }
  
  if( !mobile) {
    return res.sendStatus(500);
  }
  
  // 收集整理数据
  let store = req.body.store || '默认1店';
  let device = req.body.device || '默认设备';
  let status = req.body.status || '默认参数超标！';
  let time = req.body.time || new Date().toLocaleString();
  
  let alarm = {};
  alarm.templateId = wx.tmpIdFireAlarm;;
  alarm.url = WX_MSG_URL;
  alarm.data = {
    "first":{
    "value": '你好, 请注意:',
    "color": "#173177"
    },
    "keyword1":{
    "value": time,
    "color": "#173177"
    },
    "keyword2":{
    "value": store,
    "color": "#173177"
    },
    "keyword3": {
    "value": device,
    "color": "#173177"
    },
    "keyword4": {
    "value": status,
    "color":"#173177"
    },
    "remark":{
    "value": '请及时处理！',
    "color":"#173177"
    }
  };
  alarm.type = 'fire_alarm';
  
  // 处理批量手机号码
  //mobile = '13011112222';
  let mobiles = mobile.split(',');
  let dry_mobs = mobiles.map( (m) => {
    return m.trim();
  });
  
  // 查询并发送报警
  db.query(fireUsers.getUsersByMobile, [dry_mobs], function (err, users) {
    //console.log('users:', err, users);
    if(err) return	next(err);
    
    sendAlarm(alarm, users);
    let to_mobiles = users.map(function(u) {
      return u.mobile;
    });
    
    res.send({
      err: 0,
      msg: 'success',
      to_mobiles,
    });
  });
});

app.get('/test', function (req, res) {
  let store = 'TEST1店';
  let device = 'TEST压缩机';
  let status = 'TEST压力报警';
  let time = new Date().toLocaleString();
  
  let alarm = {};
  alarm.templateId = wx.tmpIdFireAlarm;;
  alarm.url = WX_MSG_URL;
  alarm.data = {
    "first":{
    "value": '你好, 请注意:',
    "color": "#173177"
    },
    "keyword1":{
    "value": time,
    "color": "#173177"
    },
    "keyword2":{
    "value": store,
    "color": "#173177"
    },
    "keyword3": {
    "value": device,
    "color": "#173177"
    },
    "keyword4": {
    "value": status,
    "color":"#173177"
    },
    "remark":{
    "value": '请及时处理！',
    "color":"#173177"
    }
  };
  alarm.type = 'fire_alarm';
  
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
