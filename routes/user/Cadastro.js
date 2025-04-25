const express = require('express'); //Importando o express
const router = express.Router(); // Importando o módulo de rotas do express
const util = require('util');
require('dotenv').config();

const bcrypt = require('bcrypt'); //Importando criptografia para senhas
const nodemailer = require('nodemailer'); //Importando um gerenciador de envio email
const jwt = require('jsonwebtoken');

const connection = require('../../database/database'); // Importando conexao com o banco
const query = util.promisify(connection.query).bind(connection); //Permitindo usar promises no mysql com a variavel query

const jwtSecret = process.env.JWT_SECRET;

// Configura o e-mail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

//ROTAS

router.get('/cadastro', async (req, res) => {
    //Se servidor responder corretamente
    try {
        res.status(200).json({
            success: false,
            message: 'Digite um nome válido.'
        })
    }
    //Se o servidor não responder corretamente
    catch {
        res.status(500).json({
            message: 'Erro interno no servidor'
        })
    }
});

router.post('/cadastro', async (req, res) => {
    try {
        const { nome, data_nascimento, email, senha, confirmaSenha } = req.body;


        const nomeExiste = await query('SELECT * FROM usuario WHERE nome = ?', [nome.toLowerCase().trim()]);
        const emailExiste = await query('SELECT * FROM usuario WHERE email = ?', [email.toLowerCase().trim()]);
        const emailPendente = await query('SELECT * FROM usuarios_pendentes WHERE email = ?', [email.toLowerCase().trim()]);

        if (nomeExiste.length > 0 || emailExiste.length > 0) {
            return res.status(400).json({ success: false, message: 'E-mail ou nome já estão cadastrados.' });
        }

        if (emailPendente.length > 0){
            return res.status(400).json({ success: false, message: 'Já foi enviado um e-mail de confirmação, Por favor verifique.' });
        }

        if (senha !== confirmaSenha) {
            return res.status(400).json({ success: false, message: 'Senhas não coincidem.' });
        }

        const regexSenha = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%¨&!]).{8,}$/;
        if (!regexSenha.test(senha)) {
            return res.status(400).json({ success: false, message: 'Senha fraca. Use pelo menos 8 caracteres, uma letra maiúscula, um número e um símbolo.' });
        }

        const salt = bcrypt.genSaltSync(10);
        const senhaCriptografada = bcrypt.hashSync(senha, salt);

        // Salva na tabela pendente
        await query(
            'INSERT INTO usuarios_pendentes (nome, dt_nascimento, email, senha) VALUES (?, ?, ?, ?)',
            [nome.toLowerCase().trim(), data_nascimento, email.toLowerCase().trim(), senhaCriptografada]
        );

        const token = jwt.sign({ email: email.trim().toLowerCase() }, jwtSecret, { expiresIn: '15min' });
        const link = `http://${process.env.IP}:${process.env.PORT}/confirmar-email?token=${token}`;

        // Envia e-mail
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Confirme seu cadastro',
            html: `<h3>Olá ${nome},</h3><p>Clique no link abaixo para confirmar seu cadastro:</p><a href="${link}">${link}</a><p>Este link expira em 15 minutos.</p>`
        });

        res.status(200).json({ success: true, message: 'E-mail de confirmação enviado. Verifique sua caixa de entrada.' });
        console.log(`Um novo usúario tentou se cadastrar, E-mail de confirmação enviado para "${email}"`)

    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    }
});

router.get('/confirmar-email', async (req, res) => {
    const { token } = req.query;

    if (!token) return res.status(400).send('Token não fornecido.');

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const email = decoded.email;

        const pendente = await query('SELECT * FROM usuarios_pendentes WHERE email = ?', [email]);

        if (pendente.length === 0) {
            return res.status(400).send('Usuário não encontrado ou já confirmado.');
        }

        const { nome, dt_nascimento, senha } = pendente[0];

        // Move para a tabela definitiva
        await query(
            'INSERT INTO usuario (nome, dt_nascimento, email, senha, imagem, criado, modificado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, dt_nascimento, email, senha, '', new Date(), new Date()]
        );

        // Remove da pendente
        await query('DELETE FROM usuarios_pendentes WHERE email = ?', [email]);

        res.send('E-mail confirmado com sucesso! Agora você pode fazer login.');
        console.log(`O e-mail enviado para "${email}" foi confirmado, Cadastro realizado!`)

    } catch (err) {
        return res.status(400).send('Token inválido ou expirado.');
    }
});


module.exports = router;