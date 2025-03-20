module.exports = {
    apps: [
      {
        name: "lawanalytics-server",
        script: "./server.js",
        instances: 1,
        exec_mode: "fork",
        env: {
          // Variables por defecto para todos los entornos
          NODE_ENV: "development",
          PORT: 3001
        },
        env_development: {
          NODE_ENV: "development",
          PORT: 5000,
          DEBUG: "app:*"
        },
        env_production: {
          NODE_ENV: "production",
          PORT: 5000,
          DEBUG: "app:error"
        },
        watch: false,
        max_memory_restart: "1G",
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        error_file: "./logs/lawanalytics-error.log",
        out_file: "./logs/lawanalytics-output.log"
      }
    ]
  };