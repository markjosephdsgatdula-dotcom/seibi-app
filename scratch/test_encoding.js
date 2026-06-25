const fs = require('fs');
const iconv = require('iconv-lite');

try {
  // Let's take the sample Mojibake string
  const sample = "繝代Ρ繝ｼ繧ｽ繝ｼ繧ｹ・域ｺｶ謗･髮ｻ貅撰ｼ芽｣丞・縺ｮ繝輔ぅ繝ｫ繧ｿ繝ｼ繧貞叙繧雁､悶＠縲∫ｲ牙｡ｵ繧偵お繧｢繝ｼ繝悶Ο繝ｼ縺吶ｋ縺九€∵眠縺励＞繧ゅ・縺ｫ莠､謠帙☆";
  console.log('Original Mojibake sample:', sample);

  // Encode to cp932 (Windows-31J / Shift-JIS)
  const buf = iconv.encode(sample, 'cp932');
  console.log('Encoded buffer hex (first 20 bytes):', buf.slice(0, 20).toString('hex'));

  // Decode as UTF-8
  const restored = buf.toString('utf8');
  console.log('Restored text:', restored);

} catch (err) {
  console.error('Error:', err);
}
