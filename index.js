const express = require('express') // Importando Express
const app = express() //Carregando express dentro da const app

app.use(express.json()) //Informando que vai ser usado JSON
app.use(express.static('public')) // Informando a pasta de arquivos estaticos


//Importando Rotas
const Cadastro = require('./routes/user/Cadastro')

const connection = require('./database/database'); // Importando conexao com o banco

connection.connect((err) => {
    if (err) {
        console.log('Erro ao conectar com o banco de dados: ', err)
    }
    else {
        console.log(`Conexão com o banco de dados realizada com sucesso!\n-----------------\n`)
    }
})

app.get('/', async (req, res) => {
    try {
        res.status(200).json({
            message: 'Pagina inicial'
        })
    }
    catch {
        res.status(500).json({
            message: 'Erro interno no servidor'
        })
    }
})
//Importando as rotas de usuarios do arquivo usuario.js
app.use('/', Cadastro)



app.listen(3000, () => { console.log('Servidor Online!') }) // Criando um servidor