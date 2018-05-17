var userSQL = {  
  create:'INSERT INTO users(mobile,openid) VALUES(?,?)', 
  queryAll:'SELECT * FROM users',  
  getUserByOpenid:'SELECT * FROM users WHERE openid = ?', 
  getUserByMobile:'SELECT * FROM users WHERE mobile = ? ', 
  getUsersByMobile:'SELECT * FROM users WHERE mobile IN (?)', 
  delUserByMobile:'DELETE FROM users WHERE mobile = ? ',
};
module.exports = userSQL;