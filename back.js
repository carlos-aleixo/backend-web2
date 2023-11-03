const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const porta = 3030;

const db = new sqlite3.Database('./banco.db');

db.run(`
    CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    horario DATETIME,
    paciente TEXT,
    medico TEXT,
    status TEXT CHECK(status IN ('agendado', 'cancelado', 'concluido'))
);
`);

app.use(express.json());
app.use(cors());

app.get('/consultas', (req, res) => {
    const sql = 'SELECT * FROM consultas';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ consultas: rows });
    });
});

app.post('/consultas', (req, res) => {
    const { horario, paciente, medico, status } = req.body;
    const s = 'agendado';

    const dataAtual = new Date();
    const dataConsulta = new Date(horario);

    if (dataConsulta < dataAtual) {
        return res.status(400).json({ error: 'A data e hora fornecidas estão no passado' });
    }
    db.all('SELECT * FROM consultas WHERE horario=? AND medico=? AND status=?', 
           [horario, medico, s], 
           (err, rows) => {   
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (rows.length === 0) { 
            const sql = 'INSERT INTO consultas (horario, paciente, medico, status) VALUES (?, ?, ?, ?)';
            
            db.run(sql, [horario, paciente, medico, status], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Consulta agendada com sucesso!', id: this.lastID });
            });          
        } else {
            res.status(409).json({ message: 'Este medico já tem uma consulta marcada nesse horario'});
        }
    });
});

app.put('/consultas/:id', (req, res) => {
    const id = req.params.id;
    
    const sql = 'UPDATE consultas SET status = ? WHERE id = ?';
    
    db.run(sql, ['cancelado', id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Consulta não existe' });
        }
        res.json({ message: 'Consulta cancelada' });
    });
});

app.listen(porta, () => {
  console.log(`Executando em localhost:${porta}`);
});
