var userSQL = {  
  create:'INSERT INTO fire_users(mobile,openid) VALUES(?,?)', 
  queryAll:'SELECT * FROM fire_users',  
  getUserByOpenid:'SELECT * FROM fire_users WHERE openid = ?', 
  getUserByMobile:'SELECT * FROM fire_users WHERE mobile = ? ', 
  getUsersByMobile:'SELECT * FROM fire_users WHERE mobile IN (?) OR super>0', 
  delUserByMobile:'DELETE FROM fire_users WHERE mobile = ? ',
};
module.exports = userSQL;