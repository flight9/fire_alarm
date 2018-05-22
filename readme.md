# Fire Alarm

## 依赖
- wxconfig.js 格式
```
module.exports = {
  appId: 'xxxx',
  appSecret: 'xxxxx',
  tmpIdFireAlarm: 'xxxxx',
};
```
如果切换公众号, 可能 /test 测试 users.js 中 openid 要改下。

- aliconfig.js 格式
```
module.exports = {
  AccessKeyID: 'xxxx',
  AccessKeySecret: 'xxxx'
};
```

- mysql 建 fire_alarm 账号, 改密码

- mysql 导入表结构: fire_users, captchas

- 域名确定后, 修改 WX_WEB_URL; 菜单; 安全域名;