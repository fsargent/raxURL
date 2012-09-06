var Encoder = require('qr').Encoder;

module.exports = {
  return_qr: function(url, cb){
    var encoder = new Encoder();
    encoder.on('end', cb);
    encoder.encode(url);
  }
};