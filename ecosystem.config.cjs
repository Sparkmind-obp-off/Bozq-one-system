module.exports = {
  apps: [{
    name: 'bosku-one-system',
    script: 'npx',
    args: 'wrangler pages dev dist --local --ip 0.0.0.0 --port 3000',
    env: { NODE_ENV: 'development' },
    instances: 1,
    exec_mode: 'fork',
    watch: false
  }]
}
