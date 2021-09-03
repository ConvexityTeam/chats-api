require("dotenv").config();

const app = require("./app");
const port = process.env.PORT || "3000";

const errorHandler = (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const address = server.address();
  const bind =
    typeof address === "string" ? "pipe " + address : "port: " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges.");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use.");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

app.set("port", port);
app.set("trust proxy", 1);

app.on("error", errorHandler);


app.listen(port, () => {
  console.log('========================================');
  console.log(`Chats Backend  API Up - Listen---`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Port: ${port}`);
  console.log('========================================');
});
