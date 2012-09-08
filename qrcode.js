var Encoder = require('qr').Encoder;

module.exports = {
  return_qr: function(url, cb, size){
    var encoder = new Encoder();
    encoder.on('end', cb);
    encoder.encode(url, path = null, options = {margin: 1, dot_size: size});
  }
};