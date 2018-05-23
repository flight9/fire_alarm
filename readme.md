# Fire Alarm

## 依赖
- wxconfig.js 格式
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

- aliconfig.js 格式
```
module.exports = {
  AccessKeyID: 'xxxx',
  AccessKeySecret: 'xxxx'
};
```

- mysql 建 fire_alarm 账号, 改密码

- mysql 导入表结构: fire_users, captchas

- 域名 修改后, 修改 webUrl; 菜单; 安全域名;