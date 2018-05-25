# Fire Alarm

## 依赖 Dependency
- wxconfig.js 格式 Format
```
module.exports = {
  appId: 'xxxx',
  appSecret: 'xxxxx',
  webUrl: 'http://www.xxxxx.com',
  tmpIdFireAlarm: 'xxxxx',
  tmpIdKpiAlarm: 'xxxxx',
};
```
如果切换公众号, 可能 /test 测试 users.js 中 openid 要改下。
If wechat changed, the openid of users.js should be changed when /test.

- aliconfig.js 格式 Format
```
module.exports = {
  AccessKeyID: 'xxxx',
  AccessKeySecret: 'xxxx'
};
```

- mysql 建 fire_alarm 账号, 改密码
mysql need to establish new fire_alarm account and new password

- mysql 导入表结构: fire_users, captchas
mysql need to import structs of fire_users, captchas

- 域名 修改后, 修改 webUrl; 菜单; 安全域名;
If domain changed, change webUrl, menu, safe domains.