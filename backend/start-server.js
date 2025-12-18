const { spawn } = require('child_process');
const path = require('path');

console.log('正在启动后端服务...');
console.log('工作目录:', __dirname);

const child = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (error) => {
  console.error('启动失败:', error);
});

child.on('exit', (code) => {
  console.log(`服务退出，代码: ${code}`);
});

