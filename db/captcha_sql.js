var SQL = {  
  create:'INSERT INTO captchas(mobile,captcha,expire,count) VALUES(?,?,?,1)', 
  update:'UPDATE captchas SET captcha=?,expire=?,count=? WHERE mobile=?', 
  upsert:'INSERT INTO captchas(mobile,captcha,expire,count) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE captcha=?,expire=?,count=?', 
  queryAll:'SELECT * FROM captchas',
  getByMobile:'SELECT * FROM captchas WHERE mobile=?',
  delExpire:'DELETE FROM captchas WHERE expire<unix_timestamp()',
};
module.exports = SQL;