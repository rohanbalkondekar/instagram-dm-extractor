        // ============================================
        // CHAT DATA (injected from extension)
        // ============================================
        let chatData = null;
        let extractionStats = null;
        try {
            chatData = __CHAT_JSON__;
            extractionStats = __STATS_JSON__;
        } catch (e) {
            // Running as an extension page — data arrives via chrome.storage below.
        }
        // ============================================

        function startApp() {
            const messagesContainer = document.getElementById('messagesContainer');
            const scrollBottomBtn = document.getElementById('scrollBottomBtn');
            const statusTime = document.getElementById('statusTime');
            const chatHeader = document.getElementById('chatHeader');
            const searchBtn = document.getElementById('searchBtn');
            const cancelSearchBtn = document.getElementById('cancelSearchBtn');
            const searchBar = document.getElementById('searchBar');
            const searchInput = document.getElementById('searchInput');
            const searchCount = document.getElementById('searchCount');
            const searchUpBtn = document.getElementById('searchUpBtn');
            const searchDownBtn = document.getElementById('searchDownBtn');
            const reactionPopupOverlay = document.getElementById('reactionPopupOverlay');
            const reactorList = document.getElementById('reactorList');
            const closeReactionPopupBtn = document.getElementById('closeReactionPopup');
            const lightboxOverlay = document.getElementById('lightboxOverlay');
            const lightboxImage = document.getElementById('lightboxImage');
            const lightboxClose = document.getElementById('lightboxClose');
            const messageInput = document.getElementById('messageInput');

            // IST Timezone (UTC+5:30)
            // Render times in the viewer's local timezone. (Earlier this was hardcoded
            // to IST, so exports read the wrong time and grouped onto the wrong day for
            // everyone outside India.)
            function toLocal(ts) {
                return new Date(ts * 1000);
            }

            function formatISTTime(ts) {
                const d = toLocal(ts);
                let h = d.getHours();
                const m = d.getMinutes().toString().padStart(2, '0');
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return h + ':' + m + ' ' + ampm;
            }

            function formatISTDateTime(ts) {
                const d = toLocal(ts);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' at ' + formatISTTime(ts);
            }

            function getDateKey(ts) {
                const d = toLocal(ts);
                const year = d.getFullYear();
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                return year + '-' + month + '-' + day;
            }

            function formatDateLabel(dk) {
                const parts = dk.split('-');
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                const now = new Date();
                const today = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                const yestKey = yesterday.getFullYear() + '-' + (yesterday.getMonth() + 1).toString().padStart(2, '0') + '-' + yesterday.getDate().toString().padStart(2, '0');
                
                if (dk === today) return 'Today';
                if (dk === yestKey) return 'Yesterday';
                
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                const diff = Math.floor((now - d) / 86400000);
                if (diff < 7 && diff > 1) return days[d.getDay()];
                return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
            }

            function getDisplayName(u) {
                if (u === 'me') return 'You';
                return (u || '').replace(/^_|_$/g, '');
            }

            function escapeHtmlText(str) {
                if (!str) return '';
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            }

            function highlightText(text, query) {
                if (!query || !text) return text;
                // text is already HTML-escaped, so escape the query the same way
                // before matching — otherwise "it's" never matches "it&#39;s".
                const q = escapeHtmlText(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp('(' + q + ')', 'gi');
                return text.replace(regex, '<span class="search-highlight-text">$1</span>');
            }

            function buildReplyPreview(replyTo, sender) {
                if (!replyTo) return null;
                const label = replyTo.sender === 'me' ? 'You' : getDisplayName(replyTo.sender);
                let icon = '💬';
                if (replyTo.text === '[Photo]' || replyTo.text === '[Media]') icon = '📷';
                else if (replyTo.text === '[Reel share]') icon = '🎬';
                
                let txt = replyTo.text;
                if (txt === '[Photo]' || txt === '[Media]') txt = 'Photo';
                if (txt === '[Reel share]') txt = 'Reel';
                if (txt.length > 50) txt = txt.substring(0, 50) + '...';
                
                const w = document.createElement('div');
                w.className = 'reply-preview ' + (sender === 'me' ? 'sent-reply' : 'received-reply');
                w.title = 'Reply to ' + label + ': ' + replyTo.text;
                w.innerHTML = '<div class="reply-bar"></div><div class="reply-content"><span class="reply-sender"><span class="reply-icon">' + icon + '</span> ' + escapeHtmlText(label) + '</span><span class="reply-text">' + escapeHtmlText(txt) + '</span></div>';
                return w;
            }

            // Force color emoji presentation — IG sends bare U+2764 etc.,
            // which otherwise renders as a black text glyph.
            function emojiFix(s) {
                return (s || '').replace(/([☀-➿])(?!️)/g, '$1️');
            }

            function buildReactionBadge(reactions) {
                if (!reactions || !reactions.length) return null;
                const uniq = [];
                for (let i = 0; i < reactions.length; i++) {
                    if (!uniq.includes(reactions[i].emoji)) uniq.push(reactions[i].emoji);
                }
                const b = document.createElement('div');
                b.className = 'reaction-badge';
                b.innerHTML = '<span>' + escapeHtmlText(emojiFix(uniq.join(''))) + '</span>' + (reactions.length > 1 ? '<span class="count-display">' + reactions.length + '</span>' : '');
                b.title = 'Click to see who reacted';
                b.addEventListener('click', function(e) { e.stopPropagation(); showReactionPopup(reactions); });
                return b;
            }

            function buildMessageElement(msg, query) {
                if (msg._type === 'date_separator') {
                    const s = document.createElement('div');
                    s.className = 'date-separator';
                    s.innerHTML = '<span>' + formatDateLabel(msg._dateKey) + '</span>';
                    s.setAttribute('data-date-key', msg._dateKey);
                    s.setAttribute('data-msg-index', msg._globalIndex);
                    return s;
                }

                const isMe = msg.sender === 'me';
                const isAction = msg._isActionLog;
                const row = document.createElement('div');
                row.className = 'message-row ' + (isAction ? 'action-log' : (isMe ? 'sent' : 'received'));
                row.setAttribute('data-msg-index', msg._globalIndex);
                row.setAttribute('data-date-time', formatISTDateTime(msg.timestampUnix));
                if (msg._searchMatch) row.setAttribute('data-search-match', 'true');

                if (msg._showSender) {
                    const sn = document.createElement('div');
                    sn.className = 'sender-name';
                    sn.textContent = getDisplayName(msg.sender);
                    row.appendChild(sn);
                }

                if (msg.replyTo) {
                    const rp = buildReplyPreview(msg.replyTo, msg.sender);
                    if (rp) row.appendChild(rp);
                }

                let cw = document.createElement('div');
                cw.style.position = 'relative';

                if (isAction) {
                    const b = document.createElement('div');
                    b.className = 'message-bubble';
                    b.textContent = msg.text;
                    cw.appendChild(b);
                } else if ((msg.type === 'media' || msg.type === 'animated_media') && msg.mediaUrl) {
                    const mb = document.createElement('div');
                    mb.className = 'media-bubble';
                    const isVideo = msg.text === '[Video]' || /\.mp4(\?|$)/i.test(msg.mediaUrl);
                    if (isVideo) {
                        // Render videos as a playable element — assigning an mp4 to <img>
                        // fails and mislabels the attachment as a photo.
                        const v = document.createElement('video');
                        v.src = msg.mediaUrl;
                        v.controls = true;
                        v.preload = 'metadata';
                        v.style.cssText = 'width:100%;max-height:350px;border-radius:15px;display:block;background:#000;';
                        v.onerror = function() {
                            mb.innerHTML = '<div style="width:200px;height:150px;display:flex;align-items:center;justify-content:center;background:#2a2a2a;border-radius:15px;color:#888;">🎬 Video</div>';
                        };
                        mb.appendChild(v);
                    } else {
                        const img = document.createElement('img');
                        img.src = msg.mediaUrl;
                        img.alt = 'Photo';
                        img.loading = 'lazy';
                        img.addEventListener('click', function(e) { e.stopPropagation(); openLightbox(msg.mediaUrl); });
                        img.onerror = function() {
                            img.style.display = 'none';
                            mb.innerHTML = '<div style="width:200px;height:150px;display:flex;align-items:center;justify-content:center;background:#2a2a2a;border-radius:15px;color:#888;">📷 Photo</div>';
                        };
                        mb.appendChild(img);
                    }
                    cw = mb;
                    cw.style.position = 'relative';
                } else if (msg.type === 'reel_share' || msg.type === 'clip') {
                    const owner = msg.reelOwner || ((msg.text || '').match(/@([\w.]+)/) || [])[1] || '';
                    const rb = document.createElement('div');
                    rb.className = 'reel-share-bubble';
                    rb.innerHTML = '<div class="reel-icon"><svg viewBox="0 0 24 24"><polygon points="8 5 19 12 8 19" fill="#fff"/></svg></div><div><span class="reel-label">Reel</span><br><span class="reel-owner">' + escapeHtmlText(owner ? '@' + owner : 'Reel') + '</span></div>';
                    cw.appendChild(rb);
                    // reel_share text is the sender's comment on the reel — keep it
                    if (msg.text && msg.text[0] !== '[') {
                        const b = document.createElement('div');
                        b.className = 'message-bubble';
                        b.style.marginTop = '2px';
                        b.innerHTML = query ? highlightText(escapeHtmlText(msg.text), query) : escapeHtmlText(msg.text);
                        cw.appendChild(b);
                    }
                } else {
                    const b = document.createElement('div');
                    b.className = 'message-bubble';
                    if (/^\[.*\]$/.test(msg.text || '')) b.classList.add('meta');
                    b.innerHTML = query ? highlightText(escapeHtmlText(msg.text), query) : escapeHtmlText(msg.text);
                    cw.appendChild(b);
                }

                if (msg.reactions && msg.reactions.length) {
                    const badge = buildReactionBadge(msg.reactions);
                    if (badge) { cw.appendChild(badge); row.classList.add('has-reaction'); }
                }

                row.appendChild(cw);

                // Permanent link to a shared reel/post/clip. Only render our own
                // validated https instagram.com permalinks, never arbitrary text.
                if (msg.permalink && /^https:\/\/www\.instagram\.com\//.test(msg.permalink)) {
                    const a = document.createElement('a');
                    a.className = 'permalink-chip';
                    a.href = msg.permalink;
                    a.target = '_blank';
                    a.rel = 'noopener';
                    a.textContent = '🔗 Open on Instagram';
                    row.appendChild(a);
                }

                if (msg._showTimestamp) {
                    const ts = document.createElement('div');
                    ts.className = 'message-timestamp';
                    ts.textContent = formatISTTime(msg.timestampUnix);
                    ts.title = formatISTDateTime(msg.timestampUnix);
                    row.appendChild(ts);
                }

                return row;
            }

            function processMessages(msgs) {
                // Group chat if more than one distinct non-me sender — used to label
                // incoming bubbles so attribution is not lost (esp. in the PDF).
                const senders = {};
                for (let i = 0; i < msgs.length; i++) {
                    if (msgs[i].sender !== 'me' && msgs[i].type !== 'action_log') senders[msgs[i].sender] = 1;
                }
                const isGroup = Object.keys(senders).length > 1;
                const groups = {};
                for (let i = 0; i < msgs.length; i++) {
                    const m = msgs[i];
                    const dk = getDateKey(m.timestampUnix);
                    if (!groups[dk]) groups[dk] = [];
                    groups[dk].push(Object.assign({}, m, { _origIdx: i }));
                }
                const result = [];
                let gi = 0;
                const sortedDates = Object.keys(groups).sort();
                for (let d = 0; d < sortedDates.length; d++) {
                    const dk = sortedDates[d];
                    result.push({ _type: 'date_separator', _dateKey: dk, _globalIndex: gi++ });
                    const day = groups[dk];
                    let cur = null;
                    const grouped = [];
                    for (let i = 0; i < day.length; i++) {
                        const m = day[i];
                        const prev = i > 0 ? day[i - 1] : null;
                        const same = prev && prev.sender === m.sender && (m.timestampUnix - prev.timestampUnix) <= 120 && prev.type !== 'action_log';
                        if (m.type === 'action_log') {
                            if (cur) { grouped.push(cur); cur = null; }
                            grouped.push([Object.assign({}, m, { _isActionLog: true })]);
                        } else if (same && cur && cur[0].sender === m.sender) {
                            cur.push(m);
                        } else {
                            if (cur) grouped.push(cur);
                            cur = [m];
                        }
                    }
                    if (cur) grouped.push(cur);
                    for (let g = 0; g < grouped.length; g++) {
                        const group = grouped[g];
                        for (let j = 0; j < group.length; j++) {
                            result.push(Object.assign({}, group[j], {
                                _globalIndex: gi++,
                                _showTimestamp: j === group.length - 1,
                                _showSender: j === 0 && isGroup && group[j].sender !== 'me' && !group[j]._isActionLog,
                                _isActionLog: group[j]._isActionLog || false
                            }));
                        }
                    }
                }
                return result;
            }

            function renderAllMessages() {
                messagesContainer.innerHTML = '';
                if (!chatData || !chatData.messages || !chatData.messages.length) {
                    messagesContainer.innerHTML = '<div style="text-align:center;color:#8e8e93;padding:40px;">No messages</div>';
                    return [];
                }
                const processed = processMessages(chatData.messages);
                const frag = document.createDocumentFragment();
                for (let i = 0; i < processed.length; i++) {
                    frag.appendChild(buildMessageElement(processed[i], ''));
                }
                messagesContainer.appendChild(frag);
                setTimeout(function() {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 0);
                return processed;
            }

            let allProcessedMessages = [];
            allProcessedMessages = renderAllMessages() || [];

            // Search
            let searchMode = false, searchResults = [], searchIdx = -1;

            function enterSearch() {
                if (searchMode) return;
                searchMode = true;
                chatHeader.classList.add('search-mode');
                searchInput.value = '';
                searchResults = [];
                searchIdx = -1;
                updateSearchUI();
                setTimeout(function() { searchInput.focus(); }, 100);
            }

            function exitSearch() {
                searchMode = false;
                chatHeader.classList.remove('search-mode');
                searchInput.value = '';
                searchResults = [];
                searchIdx = -1;
                allProcessedMessages = renderAllMessages() || [];
            }

            function doSearch(query) {
                if (!query || query.length < 1) {
                    searchResults = [];
                    searchIdx = -1;
                    updateSearchUI();
                    allProcessedMessages = renderAllMessages() || [];
                    return;
                }
                searchResults = [];
                const lq = query.toLowerCase();
                for (let i = 0; i < allProcessedMessages.length; i++) {
                    const m = allProcessedMessages[i];
                    if (m._type === 'date_separator') {
                        if (formatDateLabel(m._dateKey).toLowerCase().indexOf(lq) !== -1) searchResults.push(i);
                    } else {
                        if (m.text && m.text.toLowerCase().indexOf(lq) !== -1) searchResults.push(i);
                        const ts = formatISTDateTime(m.timestampUnix).toLowerCase();
                        if (ts.indexOf(lq) !== -1 && searchResults.indexOf(i) === -1) searchResults.push(i);
                    }
                }
                searchIdx = searchResults.length > 0 ? 0 : -1;
                updateSearchUI();
                messagesContainer.innerHTML = '';
                const frag = document.createDocumentFragment();
                for (let i = 0; i < allProcessedMessages.length; i++) {
                    const m = allProcessedMessages[i];
                    const el = buildMessageElement(m, query);
                    if (searchResults.indexOf(m._globalIndex) !== -1) el.setAttribute('data-search-match', 'true');
                    frag.appendChild(el);
                }
                messagesContainer.appendChild(frag);
                if (searchResults.length > 0) navigateToResult(0);
            }

            function updateSearchUI() {
                if (searchResults.length > 0) {
                    searchCount.textContent = (searchIdx + 1) + '/' + searchResults.length;
                } else {
                    searchCount.textContent = (searchMode && searchInput.value) ? '0/0' : '';
                }
                searchUpBtn.disabled = searchResults.length <= 1;
                searchDownBtn.disabled = searchResults.length <= 1;
            }

            function navigateToResult(target) {
                if (!searchResults.length) return;
                if (target === 'next') searchIdx = (searchIdx + 1) % searchResults.length;
                else if (target === 'prev') searchIdx = (searchIdx - 1 + searchResults.length) % searchResults.length;
                else searchIdx = target;
                updateSearchUI();
                const idx = searchResults[searchIdx];
                const el = messagesContainer.querySelector('[data-msg-index="' + idx + '"]');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('search-highlight');
                    setTimeout(function() { el.classList.remove('search-highlight'); }, 2000);
                }
            }

            // Lightbox
            function openLightbox(url) {
                lightboxImage.src = url;
                lightboxOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            function closeLightbox() {
                lightboxOverlay.classList.remove('active');
                lightboxImage.src = '';
                document.body.style.overflow = '';
            }

            // Reaction popup
            function showReactionPopup(reactions) {
                reactorList.innerHTML = '';
                if (!reactions || !reactions.length) return;
                const grouped = {};
                for (let i = 0; i < reactions.length; i++) {
                    const r = reactions[i];
                    const k = r.user + '_' + r.emoji;
                    if (!grouped[k]) grouped[k] = { user: r.user, emoji: r.emoji, count: 0 };
                    grouped[k].count++;
                }
                const reactionCount = Object.keys(grouped).length;
                document.getElementById('reactionPopupTitle').textContent = 'Reactions (' + reactionCount + ')';
                const groupedValues = Object.values(grouped);
                for (let i = 0; i < groupedValues.length; i++) {
                    const r = groupedValues[i];
                    const item = document.createElement('div');
                    item.className = 'reactor-item';
                    item.innerHTML = '<span class="reactor-emoji">' + escapeHtmlText(emojiFix(r.emoji)) + '</span><span class="reactor-name">' + escapeHtmlText(getDisplayName(r.user)) + (r.count > 1 ? ' (×' + r.count + ')' : '') + '</span>';
                    reactorList.appendChild(item);
                }
                reactionPopupOverlay.classList.add('active');
            }
            function hideReactionPopup() {
                reactionPopupOverlay.classList.remove('active');
            }

            // Event listeners
            document.getElementById('printBtn').addEventListener('click', function() { window.print(); });
            searchBtn.addEventListener('click', enterSearch);
            cancelSearchBtn.addEventListener('click', exitSearch);
            searchInput.addEventListener('input', function(e) { doSearch(e.target.value); });
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); navigateToResult(e.shiftKey ? 'prev' : 'next'); }
                if (e.key === 'Escape') exitSearch();
            });
            searchUpBtn.addEventListener('click', function() { navigateToResult('prev'); });
            searchDownBtn.addEventListener('click', function() { navigateToResult('next'); });

            lightboxClose.addEventListener('click', function(e) { e.stopPropagation(); closeLightbox(); });
            lightboxOverlay.addEventListener('click', function(e) { if (e.target === lightboxOverlay) closeLightbox(); });

            closeReactionPopupBtn.addEventListener('click', hideReactionPopup);
            reactionPopupOverlay.addEventListener('click', function(e) { if (e.target === reactionPopupOverlay) hideReactionPopup(); });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    if (lightboxOverlay.classList.contains('active')) closeLightbox();
                    else if (reactionPopupOverlay.classList.contains('active')) hideReactionPopup();
                    else if (searchMode) exitSearch();
                }
                if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); enterSearch(); }
            });

            messagesContainer.addEventListener('scroll', function() {
                const thresh = 300;
                const near = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < thresh;
                if (!near) {
                    scrollBottomBtn.classList.add('visible');
                } else {
                    scrollBottomBtn.classList.remove('visible');
                }
            });

            scrollBottomBtn.addEventListener('click', function() {
                messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
            });

            messageInput.addEventListener('focus', function() { messageInput.parentElement.style.borderColor = 'rgba(255,255,255,0.35)'; });
            messageInput.addEventListener('blur', function() { messageInput.parentElement.style.borderColor = 'rgba(255,255,255,0.12)'; });

            console.log('✅ Instagram DM Chat Export Loaded');
            console.log('📊 Messages: ' + (chatData.messages ? chatData.messages.length : 0));
            console.log('⏰ Times shown in your local timezone');
            console.log('🔍 Ctrl+F or click search icon to search');
            console.log('🖼️ Click images for lightbox');
            console.log('💡 Click reactions to see who reacted');
        }

        // Wait for images to finish (or 4s), then print. Force eager loading first
        // so lazy off-screen photos are not blank in the PDF.
        function printWhenReady() {
            var imgs = Array.prototype.slice.call(document.images);
            imgs.forEach(function(i) { i.loading = 'eager'; if (!i.complete && i.getAttribute('src')) i.src = i.src; });
            var pending = imgs.filter(function(i) { return !i.complete; });
            var done = false;
            var go = function() { if (!done) { done = true; window.print(); } };
            if (!pending.length) { setTimeout(go, 300); return; }
            var left = pending.length;
            var tick = function() { if (--left <= 0) go(); };
            pending.forEach(function(i) { i.addEventListener('load', tick); i.addEventListener('error', tick); });
            setTimeout(go, 4000);
        }

        // Fill the header from JS (extension-page mode has no placeholder substitution).
        function fillHeader(chat, exportedAt) {
            var messages = chat.messages || [];
            var name = chat.chatWith || 'Chat';
            document.title = 'Instagram DM - ' + name;
            document.getElementById('headerName').textContent = name;
            document.getElementById('headerAvatar').textContent =
                name.split(' ').map(function(w) { return w[0] || ''; }).slice(0, 2).join('').toUpperCase();
            document.getElementById('infoBarText').textContent = messages.length + ' messages · Exported with';
            var last = messages[messages.length - 1];
            var status = 'No messages';
            if (last && last.timestampUnix) {
                var days = Math.floor((Date.now() - last.timestampUnix * 1000) / 86400000);
                status = days <= 0 ? 'Active now' : days === 1 ? 'Active yesterday'
                    : days < 7 ? 'Active ' + days + 'd ago' : 'Active ' + Math.floor(days / 7) + 'w ago';
            } else if (last) { status = 'Active recently'; }
            document.getElementById('headerStatus').textContent = status;
            var d = new Date(exportedAt || Date.now());
            var h = d.getHours(); var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
            document.getElementById('statusTime').textContent = h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
            var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            document.getElementById('statusDate').textContent = mo[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
        }

        if (chatData) {
            // Saved-file mode: data + header baked in via placeholders.
            startApp();
            if (location.hash.indexOf('print') !== -1) printWhenReady();
        } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            // Extension-page mode: popup stashed the chat, opened this page with #print.
            chrome.storage.local.get('igdmPendingPdf', function(r) {
                var d = r && r.igdmPendingPdf;
                if (!d || !d.chat) {
                    document.body.textContent = 'No chat data found. Export a conversation from the extension popup first.';
                    return;
                }
                chatData = d.chat;
                extractionStats = d.stats || {};
                fillHeader(d.chat, d.exportedAt);
                startApp();
                chrome.storage.local.remove('igdmPendingPdf');
                if (location.hash.indexOf('print') !== -1) printWhenReady();
            });
        } else {
            document.body.textContent = 'No chat data in this file. Export it again from the extension popup.';
        }
