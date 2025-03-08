(function() {
    // Variabel untuk mengecek status hack
    let hackRunning = false;
    let getPlaysInterval = null;

    // Fungsi untuk menghasilkan string FEN dari papan catur
    function getFenString() {
        let fenString = "";
        // Loop dari baris 8 ke 1
        for (let i = 8; i >= 1; i--) {
            let emptyCount = 0;
            // Loop untuk kolom 1 sampai 8
            for (let j = 1; j <= 8; j++) {
                const position = `${j}${i}`;
                // Mengambil elemen bidak di posisi tertentu
                const pieceElement = document.querySelector(`.piece.square-${position}`);
                if (!pieceElement) {
                    // Jika tidak ada bidak, hitung jumlah kotak kosong
                    emptyCount++;
                } else {
                    // Jika ada kotak kosong sebelumnya, tambahkan angka ke string FEN
                    if (emptyCount > 0) {
                        fenString += emptyCount;
                        emptyCount = 0;
                    }
                    // Cari kelas yang panjangnya 2 (misalnya "wP" atau "bK")
                    const classes = Array.from(pieceElement.classList);
                    let pieceClass = classes.find(cls => cls.length === 2);
                    if (pieceClass) {
                        // Jika bidak milik hitam, gunakan huruf kecil, jika putih gunakan huruf besar
                        if (pieceClass[0] === 'b') {
                            fenString += pieceClass[1];
                        } else if (pieceClass[0] === 'w') {
                            fenString += pieceClass[1].toUpperCase();
                        }
                    }
                }
            }
            // Jika masih ada kotak kosong di akhir baris, tambahkan hitungan kosong
            if (emptyCount > 0) {
                fenString += emptyCount;
            }
            // Tambahkan pembatas baris jika bukan baris terakhir
            if (i > 1) {
                fenString += "/";
            }
        }
        return fenString;
    }

    // Fungsi utama untuk menjalankan hack
    function main() {
        // Cari elemen papan catur secara langsung
        const boardElement = document.querySelector('.board');
        if (!boardElement) {
            return { status: false, error: "Tidak dapat memulai layanan cheat catur. Pastikan Anda sedang dalam permainan." };
        }
        
        // Meminta input warna pemain dan validasi
        let playerColor = prompt("Apakah Anda bermain sebagai 'putih' atau 'hitam'?").toLowerCase();
        while (playerColor !== "putih" && playerColor !== "hitam") {
            playerColor = prompt("Masukkan 'putih' atau 'hitam'").toLowerCase();
        }
        // Konversi ke format FEN: "w" untuk putih dan "b" untuk hitam
        const fenColor = (playerColor === "putih") ? "w" : "b";

        // Membuat string FEN awal
        let fenString = getFenString() + ` ${fenColor}`;
        console.log("FEN awal:", fenString);

        // Menentukan kedalaman pencarian engine berdasarkan perangkat (mobile/desktop)
        const userAgent = navigator.userAgent.toLowerCase();
        const depth = userAgent.includes("mobile") ? "14" : "30";

        // Membuat Web Worker untuk Stockfish
        const engine = new Worker("/bundles/app/js/vendor/jschessengine/stockfish.asm.1abfa10c.js");
        engine.postMessage(`position fen ${fenString}`);
        engine.postMessage('go wtime 300000 btime 300000 winc 2000 binc 2000');
        engine.postMessage(`go depth ${depth}`);

        // Memantau perubahan papan dan mengirim posisi baru ke engine jika ada perubahan
        getPlaysInterval = setInterval(() => {
            let newFenString = getFenString() + ` ${fenColor}`;
            if (newFenString !== fenString) {
                fenString = newFenString;
                engine.postMessage(`position fen ${fenString}`);
                engine.postMessage('go wtime 300000 btime 300000 winc 2000 binc 2000');
                engine.postMessage(`go depth ${depth}`);
            }
        }, 1000);  // Pengecekan setiap 1 detik

        // Menangani pesan dari engine (misalnya langkah terbaik)
        engine.onmessage = function(event) {
            if (typeof event.data === "string" && event.data.startsWith('bestmove')) {
                const bestMove = event.data.split(' ')[1];
                console.log('Langkah terbaik:', bestMove);
                const bestMoveDisplay = document.getElementById("best-move");
                if (bestMoveDisplay) {
                    bestMoveDisplay.innerHTML = `Langkah terbaik: ${bestMove}. Klik untuk menghentikan.`;
                }

                // Hapus highlight sebelumnya
                document.querySelectorAll(".cheat-highlight").forEach((element) => {
                    element.remove();
                });

                // Mapping huruf ke angka untuk posisi (misal "e2e4")
                const charMap = { "a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6, "g": 7, "h": 8 };
                if (bestMove.length === 4) {
                    const initialPos = `${charMap[bestMove[0]]}${bestMove[1]}`;
                    const finalPos = `${charMap[bestMove[2]]}${bestMove[3]}`;

                    // Buat elemen highlight untuk posisi awal
                    const initialHighlight = document.createElement("div");
                    initialHighlight.className = `highlight cheat-highlight square-${initialPos}`;
                    initialHighlight.style.background = "red";
                    initialHighlight.style.opacity = "0.5";

                    // Buat elemen highlight untuk posisi akhir
                    const finalHighlight = document.createElement("div");
                    finalHighlight.className = `highlight cheat-highlight square-${finalPos}`;
                    finalHighlight.style.background = "red";
                    finalHighlight.style.opacity = "0.5";

                    // Cari elemen papan khusus (misalnya 'wc-chess-board') dan tambahkan highlight
                    const chessBoard = document.querySelector("wc-chess-board");
                    if (chessBoard) {
                        chessBoard.appendChild(initialHighlight);
                        chessBoard.appendChild(finalHighlight);
                    } else {
                        console.warn("Elemen wc-chess-board tidak ditemukan.");
                    }
                }
            }
        };

        return { status: true };
    }

    // Fungsi untuk memulai hack
    function startHack(buttonElement) {
        if (hackRunning) return;
        hackRunning = true;
        buttonElement.innerHTML = "Tunggu sebentar...";
        buttonElement.disabled = true;

        const hack = main();
        if (hack.status === true) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = `Hack berjalan. <span id='best-move'>Menghitung langkah terbaik. Klik untuk menghentikan.</span>`;
        } else {
            buttonElement.innerHTML = "Mulai Hack";
            buttonElement.disabled = false;
            alert(hack.error);
        }
    }

    // Fungsi untuk menghentikan hack
    function stopHack() {
        if (getPlaysInterval) {
            clearInterval(getPlaysInterval);
            getPlaysInterval = null;
        }
        // Hapus highlight yang telah dibuat
        document.querySelectorAll(".cheat-highlight").forEach((element) => {
            element.remove();
        });
        hackRunning = false;
        const hackButton = document.getElementById("hack_button");
        if (hackButton) {
            hackButton.innerHTML = "Mulai Hack";
        }
    }

    // Menambahkan tombol hack ke dalam halaman
    function createHackButton() {
        const button = document.createElement("button");
        button.className = "ui_v5-button-component ui_v5-button-primary ui_v5-button-large ui_v5-button-full";
        button.innerHTML = "Mulai Hack";
        button.id = "hack_button";
        // Jika tombol diklik, mulai atau hentikan hack
        button.onclick = () => {
            if (!hackRunning) {
                startHack(button);
            } else {
                stopHack();
            }
        };
        const mainBody = document.querySelector(".board-layout-main");
        if (mainBody) {
            mainBody.prepend(button);
        } else {
            console.error("Elemen board-layout-main tidak ditemukan.");
        }
    }

    // Inisialisasi tombol hack saat DOM telah siap
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createHackButton);
    } else {
        createHackButton();
    }
})();
