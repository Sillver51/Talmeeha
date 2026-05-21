const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── ROOMS ──
const rooms = {};

const WB = ['جبل','بحر','نهر','صحراء','غابة','سماء','شمس','قمر','نجوم','ريح','مطر','ثلج','رمل','صخرة','وادي','جزيرة','بركان','بحيرة','شلال','سحاب','شاطئ','تلة','كهف','مرج','دلتا','أسد','نمر','فيل','حصان','ذئب','ثعلب','نسر','دلفين','تمساح','أرنب','ببغاء','سلحفاة','عقرب','ثعبان','قرد','فهد','زرافة','دب','طاووس','صقر','حوت','قنفذ','غزال','ضبع','قط','قاهرة','رياض','دبي','بغداد','بيروت','تونس','مكة','إسطنبول','طوكيو','باريس','مطار','جسر','برج','قلعة','متحف','سوق','مسجد','معبد','قصر','ميناء','ملعب','حديقة','مكتبة','مستشفى','محطة','تمر','عسل','زيتون','رمان','فراولة','برتقال','توت','تفاح','عنب','مشمش','خبز','أرز','كباب','حلوى','شاي','قهوة','عصير','لبن','زبدة','جبن','شوكولا','فلافل','منسف','كنافة','حاسوب','هاتف','روبوت','طائرة','ليزر','شاشة','كاميرا','برنامج','شبكة','كرة','سباحة','ملاكمة','جودو','ركض','قفز','رماية','فروسية','غوص','تسلق','شعر','موسيقى','رسم','مسرح','رقص','نحت','تصوير','أدب','رواية','لحن','طبيب','مهندس','معلم','شاعر','قاضي','طاهي','رسام','نجار','صياد','بناء','أحمر','أزرق','أصفر','أخضر','بنفسجي','مثلث','دائرة','مربع','نجمة','حب','حرية','سلام','شجاعة','أمل','فرح','حزن','خيال','حقيقة','سر','مفتاح','كنز','خريطة','بوصلة','ساعة','مرآة','كتاب','قلم','رسالة','عطر','سيف','درع','تاج','رداء','خيمة','سفينة','قارب','حبل','شمعة','لؤلؤة','صاروخ','غواصة','دبابة','مروحية','فانوس','هرم','تلسكوب','ديناصور','تنين','عملاق','قزم','جن','مارد','ساحر','فارس','ملك','أميرة','ثورة','حرب','اتفاق','برلمان','دستور','علم','عاصمة','بيانو','ناي','عود','طبل','كمان','قيثارة','ترومبيت'];

function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function genCode() {
  let code;
  do { code = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (rooms[code]);
  return code;
}

function buildBoard() {
  const words = shuffle(WB).slice(0, 25);
  const st = Math.random() < 0.5 ? 'red' : 'blue';
  const types = [];
  for (let i = 0; i < 9; i++) types.push(st);
  for (let i = 0; i < 8; i++) types.push(st === 'red' ? 'blue' : 'red');
  for (let i = 0; i < 7; i++) types.push('neutral');
  types.push('assassin');
  const st2 = shuffle(types);
  return { board: words.map((w, i) => ({ w, t: st2[i], rv: false })), startTeam: st };
}

function broadcast(room) {
  io.to(room.code).emit('state', room);
}

function checkWin(room) {
  const rL = room.board.filter(c => c.t === 'red' && !c.rv).length;
  const bL = room.board.filter(c => c.t === 'blue' && !c.rv).length;
  if (rL === 0) { setWinner(room, 'red'); return true; }
  if (bL === 0) { setWinner(room, 'blue'); return true; }
  return false;
}

function setWinner(room, team) {
  room.winner = team;
  room.phase = 'ended';
  room.wins[team] = (room.wins[team] || 0) + 1;
  room.log.unshift(`🏆 فاز ${room.teamNames[team]}! 🍇`);
}

function nextTurn(room) {
  room.turn = room.turn === 'red' ? 'blue' : 'red';
  room.clue = null;
  room.gleft = 0;
  room.gphase = false;
  room.doubts = {};
}

function htd(room, t) { return t === 'red' ? room.hRed : room.hBlue; }
function hLeader(room) { return htd(room, room.turn).leader; }
function hGuesser(room) {
  const td = htd(room, room.turn);
  const g = td.players.filter(n => n !== td.leader);
  return g.length ? g[(td.gIdx || 0) % g.length] : td.players[0];
}

// ── SOCKET EVENTS ──
io.on('connection', socket => {

  // ── CREATE ROOM (host mode) ──
  socket.on('create_host', ({ hostName, redName, blueName, redPlayers, redLeader, bluePlayers, blueLeader }) => {
    const code = genCode();
    const { board, startTeam } = buildBoard();
    const room = {
      code, phase: 'playing', hostMode: true,
      hostSocketId: socket.id,
      players: {}, teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
      teamNames: { red: redName || 'الفريق الأحمر', blue: blueName || 'الفريق الأزرق' },
      board, turn: startTeam,
      clue: null, gleft: 0, gphase: false,
      winner: null, doubts: {},
      wins: { red: 0, blue: 0 },
      log: [`بدأت اللعبة! يبدأ ${redName||'الأحمر'} أو ${blueName||'الأزرق'} 🍇`],
      hRed: { players: redPlayers, leader: redLeader, gIdx: 0 },
      hBlue: { players: bluePlayers, leader: blueLeader, gIdx: 0 },
    };
    room.log = [`بدأت اللعبة! يبدأ ${room.teamNames[startTeam]} 🍇`];
    // populate players
    ['red', 'blue'].forEach(t => {
      const list = t === 'red' ? redPlayers : bluePlayers;
      const ldr = t === 'red' ? redLeader : blueLeader;
      list.forEach((name, i) => {
        const id = `h_${t}_${i}`;
        room.players[id] = { id, name, team: t };
        room.teams[t].push(id);
        if (name === ldr) room.leaders[t] = id;
      });
    });
    room.sRed = board.filter(c => c.t === 'red').length;
    room.sBlue = board.filter(c => c.t === 'blue').length;
    rooms[code] = room;
    socket.join(code);
    socket.emit('joined', { code, myId: socket.id, isHost: true });
    broadcast(room);
  });

  // ── CREATE ROOM (online mode) ──
  socket.on('create_online', ({ name }) => {
    const code = genCode();
    const room = {
      code, phase: 'lobby', hostMode: false,
      players: { [socket.id]: { id: socket.id, name, team: null } },
      teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
      teamNames: { red: 'الفريق الأحمر', blue: 'الفريق الأزرق' },
      board: [], turn: 'red', clue: null, gleft: 0, gphase: false,
      winner: null, doubts: {}, wins: { red: 0, blue: 0 },
      log: ['تم إنشاء الغرفة! 🍇'],
    };
    rooms[code] = room;
    socket.join(code);
    socket.emit('joined', { code, myId: socket.id, isHost: false });
    broadcast(room);
  });

  // ── JOIN ROOM (online mode) ──
  socket.on('join_online', ({ code, name }) => {
    const room = rooms[code];
    if (!room) { socket.emit('error', 'الغرفة غير موجودة'); return; }
    if (!room.players[socket.id]) {
      room.players[socket.id] = { id: socket.id, name, team: null };
    }
    socket.join(code);
    socket.emit('joined', { code, myId: socket.id, isHost: false });
    broadcast(room);
  });

  // ── SELECT TEAM ──
  socket.on('select_team', ({ code, team }) => {
    const room = rooms[code];
    if (!room || !room.players[socket.id]) return;
    room.teams.red = room.teams.red.filter(i => i !== socket.id);
    room.teams.blue = room.teams.blue.filter(i => i !== socket.id);
    if (room.leaders.red === socket.id && team !== 'red') room.leaders.red = null;
    if (room.leaders.blue === socket.id && team !== 'blue') room.leaders.blue = null;
    room.players[socket.id].team = team;
    room.teams[team].push(socket.id);
    broadcast(room);
  });

  // ── BECOME LEADER ──
  socket.on('become_leader', ({ code, team }) => {
    const room = rooms[code];
    if (!room) return;
    if (!room.teams[team].includes(socket.id)) {
      room.teams.red = room.teams.red.filter(i => i !== socket.id);
      room.teams.blue = room.teams.blue.filter(i => i !== socket.id);
      room.players[socket.id].team = team;
      room.teams[team].push(socket.id);
    }
    room.leaders[team] = socket.id;
    broadcast(room);
  });

  // ── START GAME (online) ──
  socket.on('start_game', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    const ok = room.teams.red.length >= 2 && room.leaders.red && room.teams.blue.length >= 2 && room.leaders.blue;
    if (!ok) return;
    const { board, startTeam } = buildBoard();
    room.board = board;
    room.phase = 'playing';
    room.turn = startTeam;
    room.clue = null; room.gphase = false; room.winner = null; room.doubts = {};
    room.sRed = board.filter(c => c.t === 'red').length;
    room.sBlue = board.filter(c => c.t === 'blue').length;
    room.log = [`بدأت اللعبة! يبدأ ${room.teamNames[startTeam]} 🍇`];
    broadcast(room);
  });

  // ── SUBMIT CLUE ──
  socket.on('submit_clue', ({ code, word, num }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'playing' || room.gphase) return;
    // verify sender is leader of current turn
    const isHostLeader = room.hostMode && room.hostSocketId === socket.id;
    const isOnlineLeader = !room.hostMode && room.leaders[room.turn] === socket.id;
    if (!isHostLeader && !isOnlineLeader) return;
    if (room.board.some(c => c.w === word && !c.rv)) return;
    room.clue = { w: word, n: num };
    room.gleft = num + 1;
    room.gphase = true;
    const who = room.hostMode ? hLeader(room) : room.players[socket.id]?.name;
    room.log.unshift(`💡 ${who}: "${word}" — ${num}`);
    broadcast(room);
  });

  // ── GUESS CARD ──
  socket.on('guess_card', ({ code, index }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'playing' || !room.gphase || room.gleft <= 0) return;
    const card = room.board[index];
    if (!card || card.rv) return;

    // verify who can guess
    const isHostGuess = room.hostMode && room.hostSocketId === socket.id;
    const playerTeam = room.players[socket.id]?.team;
    const isOnlineGuesser = !room.hostMode && playerTeam === room.turn && room.leaders[room.turn] !== socket.id;
    if (!isHostGuess && !isOnlineGuesser) return;

    card.rv = true;
    if (room.doubts[index]) delete room.doubts[index];
    const nm = room.hostMode ? hGuesser(room) : room.players[socket.id]?.name;

    if (card.t === 'assassin') {
      room.log.unshift(`☠️ ${nm} كشف القاتل!`);
      room.winner = room.turn === 'red' ? 'blue' : 'red';
      room.phase = 'ended';
      room.wins[room.winner] = (room.wins[room.winner] || 0) + 1;
      room.log.unshift(`🏆 فاز ${room.teamNames[room.winner]}! 🍇`);
      broadcast(room); return;
    }

    if (card.t === room.turn) {
      if (card.t === 'red') room.sRed = Math.max(0, room.sRed - 1);
      else room.sBlue = Math.max(0, room.sBlue - 1);
      room.gleft--;
      room.log.unshift(`✅ ${nm}: "${card.w}" — إصابة!`);
      if (checkWin(room)) { broadcast(room); return; }
      if (room.gleft <= 0) nextTurn(room);
      if (room.hostMode) htd(room, room.turn === 'red' ? (room.gleft <= 0 ? 'blue' : 'red') : (room.gleft <= 0 ? 'red' : 'blue'));
    } else {
      if (card.t === 'red') room.sRed = Math.max(0, room.sRed - 1);
      else if (card.t === 'blue') room.sBlue = Math.max(0, room.sBlue - 1);
      room.log.unshift(`❌ ${nm}: "${card.w}"`);
      if (checkWin(room)) { broadcast(room); return; }
      if (room.hostMode) htd(room, room.turn).gIdx = (htd(room, room.turn).gIdx || 0) + 1;
      nextTurn(room);
    }
    broadcast(room);
  });

  // ── TOGGLE DOUBT ──
  socket.on('toggle_doubt', ({ code, index }) => {
    const room = rooms[code];
    if (!room || !room.gphase) return;
    if (!room.doubts) room.doubts = {};
    const arr = room.doubts[index] || [];
    const key = room.hostMode ? 'host' : socket.id;
    const i = arr.indexOf(key);
    if (i >= 0) { arr.splice(i, 1); if (!arr.length) delete room.doubts[index]; else room.doubts[index] = arr; }
    else { room.doubts[index] = [...arr, key]; }
    broadcast(room);
  });

  // ── END TURN ──
  socket.on('end_turn', ({ code }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'playing') return;
    const isHost = room.hostMode && room.hostSocketId === socket.id;
    const isGuesser = !room.hostMode && room.players[socket.id]?.team === room.turn && room.leaders[room.turn] !== socket.id;
    if (!isHost && !isGuesser) return;
    room.log.unshift(`⏭ انتهى الدور`);
    nextTurn(room);
    broadcast(room);
  });

  // ── RESTART ──
  socket.on('restart', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    if (room.hostMode) {
      // go back to setup on client
      room.phase = 'setup';
      broadcast(room);
    } else {
      room.phase = 'lobby'; room.board = []; room.clue = null;
      room.gphase = false; room.winner = null; room.log = []; room.doubts = {};
      broadcast(room);
    }
  });

  // ── DISCONNECT ──
  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        room.teams.red = room.teams.red.filter(i => i !== socket.id);
        room.teams.blue = room.teams.blue.filter(i => i !== socket.id);
        if (room.leaders.red === socket.id) room.leaders.red = null;
        if (room.leaders.blue === socket.id) room.leaders.blue = null;
        if (Object.keys(room.players).length === 0) { delete rooms[code]; }
        else broadcast(room);
      }
      // if host disconnects in host mode
      if (room.hostMode && room.hostSocketId === socket.id) {
        delete rooms[code];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n🍇 تلميحة — الخادم يعمل على المنفذ ${PORT}\n`));
