CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255),
  dt_nascimento DATE,
  email VARCHAR(255) UNIQUE,
  senha VARCHAR(255),
  imagem VARCHAR(255),
  criado DATETIME,
  modificado DATETIME
);
