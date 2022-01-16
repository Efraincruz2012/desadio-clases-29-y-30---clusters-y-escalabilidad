const express = require('express')
const path = require('path')
const cluster = require('cluster');
require('dotenv').config()

const appDir = path.dirname(require.main.filename);

const yargs = require('yargs/yargs')(process.argv.slice(2))

const argumentosEntrada = yargs
.boolean('debug')
.alias({
  p: 'puerto',
  f: 'FORK',
  c: 'CLUSTER'
})
.default({
  puerto: 8080,
  FORK: 'on',
  CLUSTER: 'off', 
}).argv;

const { routerProducto } = require("./src/router/producto")
 
const { routerCarrito } = require("./src/router/carrito")

const { routerRandoms } = require("./src/router/randoms")

 
const app = express()

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.use(express.static('public'))

app.set('views', path.join(__dirname, './src/views'))
app.set('view engine', 'ejs');

const ControladorProducto = require('./Daos/ControladorDaoProducto');
const ControladorCarrito = require('./Daos/ControladorDaoCarrito');

app.get('/', async (req, res) => {
    const productos = await new ControladorProducto().listarAll();
    const carritos = await new ControladorCarrito().listarAll();
    res.render('index', { productos, carritos } );
});

/* Ruta Info */
app.get('/info', async (req, res) => {
  

    const resultado = {
        "argumentosEntrada": Object.keys(argumentosEntrada).length,
        "NombrePlataforma": process.platform, 
        "VersionNode": process.version, 
        "MemoriaTotalReservada": process.memoryUsage().rss, 
        "PathDeEjecucion": process.execPath, 
        "ProcessId": process.pid, 
        "CarpetaProyecto": appDir
    };

    res.render('info',{resultado, nroProcesadores: require('os').cpus().length });
    
});



/* ------------------------------------------------------ */
/* Cargo los routers */

app.use('/api/productos', routerProducto)
 
app.use('/api/carrito', routerCarrito)

app.use('/api/randoms', routerRandoms)


/* ------------------------------------------------------ */
/* Server Listen */

const { puerto, CLUSTER } = argumentosEntrada; 

if(CLUSTER.toLowerCase() === 'on'){
  // modo cluster
  const server = app.listen(puerto, () => {
    console.log(`Servidor escuchando en el puerto ${server.address().port} modo CLUSTER`)
  })
  server.on('error', error => console.log(`Error en servidor ${error}`))
  
  
} else {
  // modo fork

    if (cluster.isPrimary) {

      const numCPUs = require('os').cpus().length;

      for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
        console.log('creando una instancia nueva...')
      }
    
      cluster.on('exit', worker => {
        console.log(
          'Worker',
          worker.process.pid,
          'died',
          new Date().toLocaleString()
        )
        cluster.fork()
      })

    } else {

      const server = app.listen(puerto, () => {
        console.log(`Servidor escuchando en el puerto ${server.address().port} - PID WORKER ${process.pid}`)
      })
      server.on('error', error => console.log(`Error en servidor ${error}`))

    }

}



if (process.env.DB){
    console.log('Variable de entorno cargada: ', process.env.DB)    
}
