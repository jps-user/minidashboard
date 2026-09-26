let currentConfig = { 
    title: "MiniDashboard", 
    showUrls: true, 
    groups: [] 
};
let availableIcons = [];
let iconVariants = {};
let sortableInstances = [];
let groupSortableInstance = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}


document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('settings-toggle')?.addEventListener('click', () => {
        openSettingsModal();
    });

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        toggleTheme();
    });

    document.getElementById('settings-save')?.addEventListener('click', () => {
        saveSettings();
    });

    document.getElementById('group-save')?.addEventListener('click', () => {
        saveGroup();
    });

    document.getElementById('tile-icon-select')?.addEventListener('change', () => {
        onSelectIconChange();
    });

    document.getElementById('icon-fetch')?.addEventListener('click', () => {
        fetchIcon();
    });

    document.getElementById('tile-save')?.addEventListener('click', () => {
        saveTile();
    });


    initTheme();
    await loadConfig();
    await loadIconVariants();
    await loadIconsList();
    renderDashboard();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function updateRenderedIconVariants() {
    document.querySelectorAll(".dashboard-tile-icon[data-icon-name]").forEach((img) => {
        const iconName = img.dataset.iconName;
        if (iconName) {
            img.src = getIconSrc(iconName);
        }
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.classList.add('d-none');
            moonIcon.classList.remove('d-none');
        } else {
            moonIcon.classList.add('d-none');
            sunIcon.classList.remove('d-none');
        }
    }

    const container = document.getElementById('dashboard-container');
    if (container && container.children.length > 0) {
        renderDashboard();
        updateRenderedIconVariants();
    }
}

function getIconSrc(icon) {
    if (icon.startsWith('http') || icon.startsWith('/')) {
        return icon;
    }

    const theme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
    const variants = iconVariants[icon];
    const variantTheme = theme === 'dark' ? 'light' : 'dark';
    const variantName = variants && variants[variantTheme] ? variants[variantTheme] : icon;
    return `/icons/${variantName}.svg`;
}

function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

async function loadConfig() {
    try {
        const res = await fetch('/api/config?t=' + Date.now());
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        
        currentConfig = {
            title: data.title || "MiniDashboard",
            showUrls: data.showUrls !== undefined ? data.showUrls : true,
            groups: data.groups || []
        };

        updateTitle();
    } catch (err) {
        console.error("Load error:", err);
    }
}

function updateTitle() {
    const titleText = currentConfig.title || "MiniDashboard";
    const brandEl = document.getElementById('brand-title');
    const pageEl = document.getElementById('page-title');
    if (brandEl) brandEl.innerText = titleText;
    if (pageEl) pageEl.innerText = titleText;
}

async function loadIconsList() {
    try {
        const res = await fetch('/api/icons');
        if (res.ok) {
            availableIcons = await res.json();
            populateIconSelect();
        }
    } catch (err) {
        console.error("Error loading icons:", err);
    }
}

async function loadIconVariants() {
    try {
        const res = await fetch('/api/icons/variants');
        if (res.ok) {
            iconVariants = await res.json();
        }
    } catch (err) {
        console.error("Error loading icon variants:", err);
    }
}

function populateIconSelect() {
    const select = document.getElementById('tile-icon-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select local icon --</option>';
    availableIcons.forEach(icon => {
        const opt = document.createElement('option');
        opt.value = icon;
        opt.textContent = icon;
        select.appendChild(opt);
    });
}

function onSelectIconChange() {
    const selectVal = document.getElementById('tile-icon-select').value;
    if (selectVal) {
        document.getElementById('tile-icon-custom').value = selectVal;
    }
}

async function saveConfig() {
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentConfig)
        });
        
        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            const text = await res.text();
            alert(`Serverfehler (${res.status}): ${text.substring(0, 100)}`);
            return;
        }

        if (res.ok && data.status === 'ok') {
            currentConfig = data.config;
            updateTitle();
            renderDashboard();
        } else {
            alert("Save error: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        alert("Network error: Could not connect to the server.");
        console.error("Save error:", err);
    }
}

function openSettingsModal() {
    document.getElementById('setting-title').value = currentConfig.title || "MiniDashboard";
    document.getElementById('setting-show-urls').checked = currentConfig.showUrls !== false;
    
    const modalEl = document.getElementById('modal-settings');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function saveSettings() {
    const titleVal = document.getElementById('setting-title').value.trim();
    currentConfig.title = titleVal || "MiniDashboard";
    currentConfig.showUrls = document.getElementById('setting-show-urls').checked;

    const modalEl = document.getElementById('modal-settings');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    
    await saveConfig();
}

function renderDashboard() {
    const container = document.getElementById('dashboard-container');
    if (!container) return;

    container.innerHTML = '';

    sortableInstances.forEach(inst => inst.destroy());
    sortableInstances = [];

    if (groupSortableInstance) {
        groupSortableInstance.destroy();
        groupSortableInstance = null;
    }

    if (!currentConfig.groups || currentConfig.groups.length === 0) {
        const emptyCol = document.createElement('div');
        emptyCol.className = 'col-12 text-center my-5';

        const message = document.createElement('p');
        message.className = 'text-muted mb-3';
        message.textContent = 'No groups yet.';

        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary';
        button.type = 'button';

        const icon = document.createElement('i');
        icon.className = 'ti ti-folder-plus me-1';

        button.appendChild(icon);
        button.appendChild(document.createTextNode('Create your first group'));
        button.addEventListener('click', openGroupModal);

        emptyCol.appendChild(message);
        emptyCol.appendChild(button);
        container.appendChild(emptyCol);

        initTooltips();
        return;
    }

    currentConfig.groups.forEach(group => {
        const groupCol = document.createElement('div');
        groupCol.className = 'col-12 mb-4 group-item';
        groupCol.setAttribute('data-group-id', group.id);

        const card = document.createElement('div');
        card.className = 'card border-0 shadow-sm';

        const header = document.createElement('div');
        header.className = 'card-header border-bottom-0 pb-0 d-flex justify-content-between align-items-center bg-transparent';

        const title = document.createElement('h3');
        title.className = 'card-title text-success font-weight-bold mb-0';

        const dragIcon = document.createElement('i');
        dragIcon.className = 'ti ti-grip-vertical text-muted me-1 group-drag-icon cursor-move';
        dragIcon.style.touchAction = 'none';
        dragIcon.style.padding = '4px';

        title.appendChild(dragIcon);
        title.appendChild(document.createTextNode(group.name));

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';

        const dropdownButton = document.createElement('button');
        dropdownButton.className = 'btn btn-icon btn-ghost-secondary';
        dropdownButton.type = 'button';
        dropdownButton.setAttribute('data-bs-toggle', 'dropdown');
        dropdownButton.addEventListener('click', event => event.stopPropagation());

        const dotsIcon = document.createElement('i');
        dotsIcon.className = 'ti ti-dots-vertical';
        dropdownButton.appendChild(dotsIcon);

        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu dropdown-menu-end';

        const addTile = document.createElement('a');
        addTile.className = 'dropdown-item';
        addTile.href = '#';
        addTile.innerHTML = '<i class="ti ti-plus me-2"></i> Add tile';
        addTile.addEventListener('click', event => {
            event.preventDefault();
            openTileModal(group.id);
        });

        const newGroup = document.createElement('a');
        newGroup.className = 'dropdown-item';
        newGroup.href = '#';
        newGroup.innerHTML = '<i class="ti ti-folder-plus me-2"></i> Create new group';
        newGroup.addEventListener('click', event => {
            event.preventDefault();
            openGroupModal();
        });

        const renameGroup = document.createElement('a');
        renameGroup.className = 'dropdown-item';
        renameGroup.href = '#';
        renameGroup.innerHTML = '<i class="ti ti-pencil me-2"></i> Rename group';
        renameGroup.addEventListener('click', event => {
            event.preventDefault();
            openGroupModal(group.id);
        });

        const divider = document.createElement('div');
        divider.className = 'dropdown-divider';

        const deleteGroupLink = document.createElement('a');
        deleteGroupLink.className = 'dropdown-item text-danger';
        deleteGroupLink.href = '#';
        deleteGroupLink.innerHTML = '<i class="ti ti-trash me-2"></i> Delete group';
        deleteGroupLink.addEventListener('click', event => {
            event.preventDefault();
            deleteGroup(group.id);
        });

        dropdownMenu.appendChild(addTile);
        dropdownMenu.appendChild(newGroup);
        dropdownMenu.appendChild(renameGroup);
        dropdownMenu.appendChild(divider);
        dropdownMenu.appendChild(deleteGroupLink);

        dropdown.appendChild(dropdownButton);
        dropdown.appendChild(dropdownMenu);

        header.appendChild(title);
        header.appendChild(dropdown);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body pt-3';

        const tileContainer = document.createElement('div');
        tileContainer.className = 'row g-3 tile-container';
        tileContainer.setAttribute('data-group-id', group.id);

        if (group.tiles && group.tiles.length > 0) {
            group.tiles.forEach(tile => {
                const iconSrc = getIconSrc(tile.icon);

                const tileCol = document.createElement('div');
                tileCol.className = 'col-6 col-sm-4 col-md-3 col-lg-2';
                tileCol.setAttribute('data-tile-id', tile.id);

                const tileCard = document.createElement('div');
                tileCard.className = 'card card-link card-link-pop text-decoration-none position-relative h-100 text-center rounded-3';

                const tileBody = document.createElement('div');
                tileBody.className = 'card-body d-flex flex-column align-items-center justify-content-center p-3 cursor-pointer';

                tileBody.addEventListener('click', event => {
                    if (event.target.closest('.dropdown')) return;
                    window.open(tile.url, '_blank', 'noopener,noreferrer');
                });

                const img = document.createElement('img');
                img.src = iconSrc;
                img.dataset.iconName = tile.icon;
                img.className = 'mb-2 dashboard-tile-icon';
                img.style.width = '48px';
                img.style.height = '48px';
                img.style.objectFit = 'contain';

                img.addEventListener('error', () => {
                    img.removeAttribute('onerror');
                    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
                }, { once: true });

                const tileTitle = document.createElement('div');
                tileTitle.className = 'fw-bold text-truncate w-100';
                tileTitle.textContent = tile.title;

                tileBody.appendChild(img);
                tileBody.appendChild(tileTitle);

                if (currentConfig.showUrls) {
                    const urlElement = document.createElement('div');
                    urlElement.className = 'small text-muted text-truncate w-100 mt-1';
                    urlElement.style.fontSize = '0.75rem';
                    urlElement.textContent = tile.url;
                    tileBody.appendChild(urlElement);
                }

                const tileDropdown = document.createElement('div');
                tileDropdown.className = 'dropdown position-absolute top-0 end-0 m-1';

                const tileDropdownButton = document.createElement('button');
                tileDropdownButton.className = 'btn btn-icon btn-ghost-secondary btn-sm p-0 opacity-50';
                tileDropdownButton.type = 'button';
                tileDropdownButton.setAttribute('data-bs-toggle', 'dropdown');
                tileDropdownButton.addEventListener('click', event => event.stopPropagation());

                const tileDotsIcon = document.createElement('i');
                tileDotsIcon.className = 'ti ti-dots-vertical';
                tileDropdownButton.appendChild(tileDotsIcon);

                const tileDropdownMenu = document.createElement('div');
                tileDropdownMenu.className = 'dropdown-menu dropdown-menu-end';

                const editTile = document.createElement('a');
                editTile.className = 'dropdown-item';
                editTile.href = '#';
                editTile.innerHTML = '<i class="ti ti-pencil me-2"></i> Edit tile';
                editTile.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    openTileModal(group.id, tile.id);
                });

                const removeTile = document.createElement('a');
                removeTile.className = 'dropdown-item text-danger';
                removeTile.href = '#';
                removeTile.innerHTML = '<i class="ti ti-trash me-2"></i> Delete tile';
                removeTile.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteTile(group.id, tile.id);
                });

                tileDropdownMenu.appendChild(editTile);
                tileDropdownMenu.appendChild(removeTile);

                tileDropdown.appendChild(tileDropdownButton);
                tileDropdown.appendChild(tileDropdownMenu);

                tileCard.appendChild(tileBody);
                tileCard.appendChild(tileDropdown);
                tileCol.appendChild(tileCard);
                tileContainer.appendChild(tileCol);
            });
        }

        cardBody.appendChild(tileContainer);
        card.appendChild(header);
        card.appendChild(cardBody);
        groupCol.appendChild(card);
        container.appendChild(groupCol);

        const sortable = new Sortable(tileContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: function (evt) {
                handleTileReorder(evt);
            }
        });

        sortableInstances.push(sortable);
    });

    groupSortableInstance = new Sortable(container, {
        animation: 150,
        handle: '.group-drag-icon',
        onEnd: function (evt) {
            handleGroupReorder(evt);
        }
    });

    initTooltips();
}

function handleTileReorder(evt) {
    const groupId = evt.to.getAttribute('data-group-id');
    const group = currentConfig.groups.find(g => g.id === groupId);
    if (!group) return;

    const newOrderTileIds = Array.from(evt.to.children).map(child => child.getAttribute('data-tile-id'));

    group.tiles.sort((a, b) => {
        return newOrderTileIds.indexOf(a.id) - newOrderTileIds.indexOf(b.id);
    });

    saveConfig();
}

function handleGroupReorder(evt) {
    const container = document.getElementById('dashboard-container');
    const newGroupIds = Array.from(container.children)
        .map(child => child.getAttribute('data-group-id'))
        .filter(id => id !== null);

    currentConfig.groups.sort((a, b) => {
        return newGroupIds.indexOf(a.id) - newGroupIds.indexOf(b.id);
    });

    saveConfig();
}

function openGroupModal(groupId = null) {
    document.getElementById('group-id').value = groupId || '';
    if (groupId) {
        const group = currentConfig.groups.find(g => g.id === groupId);
        document.getElementById('group-name').value = group ? group.name : '';
        document.getElementById('modal-group-title').innerText = 'Rename group';
    } else {
        document.getElementById('group-name').value = '';
        document.getElementById('modal-group-title').innerText = 'Add group';
    }
    const modalEl = document.getElementById('modal-group');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function saveGroup() {
    const id = document.getElementById('group-id').value;
    const name = document.getElementById('group-name').value.trim();
    if (!name) return;

    if (id) {
        const group = currentConfig.groups.find(g => g.id === id);
        if (group) group.name = name;
    } else {
        currentConfig.groups.push({
            id: 'group-' + Date.now(),
            name: name,
            tiles: []
        });
    }
    const modalEl = document.getElementById('modal-group');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    saveConfig();
}

function deleteGroup(groupId) {
    if (!confirm('Delete this group?')) return;
    currentConfig.groups = currentConfig.groups.filter(g => g.id !== groupId);
    saveConfig();
}

async function openTileModal(groupId, tileId = null) {
    await loadIconsList();
    
    const groupSelect = document.getElementById('tile-group-select');
    groupSelect.innerHTML = '';
    currentConfig.groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        groupSelect.appendChild(opt);
    });
    groupSelect.value = groupId;

    document.getElementById('tile-group-id').value = groupId;
    document.getElementById('tile-id').value = tileId || '';

    if (tileId) {
        const group = currentConfig.groups.find(g => g.id === groupId);
        const tile = group ? group.tiles.find(t => t.id === tileId) : null;
        if (tile) {
            document.getElementById('tile-title').value = tile.title;
            document.getElementById('tile-url').value = tile.url;
            document.getElementById('tile-icon-custom').value = tile.icon;
            document.getElementById('tile-icon-select').value = availableIcons.includes(tile.icon) ? tile.icon : '';
            document.getElementById('modal-tile-title').innerText = 'Edit tile';
        }
    } else {
        document.getElementById('tile-title').value = '';
        document.getElementById('tile-url').value = '';
        document.getElementById('tile-icon-custom').value = '';
        document.getElementById('tile-icon-select').value = '';
        document.getElementById('modal-tile-title').innerText = 'Add tile';
    }
    const modalEl = document.getElementById('modal-tile');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function fetchIcon() {
    const name = document.getElementById('tile-icon-custom').value.trim();
    if (!name) return;
    try {
        const res = await fetch('/api/icons/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        const data = await res.json();
        if (data.status === 'ok') {
            document.getElementById('tile-icon-custom').value = data.icon;
            await loadIconsList();
            document.getElementById('tile-icon-select').value = data.icon;
        } else {
            alert('Icon not found');
        }
    } catch (err) {
        alert('Error fetching icon');
    }
}

function isValidTileUrl(value) {
    try {
        const url = new URL(value);
        return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
    } catch {
        return false;
    }
}

function saveTile() {
    const oldGroupId = document.getElementById('tile-group-id').value;
    const newGroupId = document.getElementById('tile-group-select').value;
    const tileId = document.getElementById('tile-id').value;
    const title = document.getElementById('tile-title').value.trim();
    const url = document.getElementById('tile-url').value.trim();
    const icon = document.getElementById('tile-icon-custom').value.trim() || 'default';

    if (!title || !url || !newGroupId) return;

    if (!isValidTileUrl(url)) {
        alert("Please enter a valid HTTP or HTTPS URL.");
        return;
    }

    if (tileId) {
        const oldGroup = currentConfig.groups.find(g => g.id === oldGroupId);
        const tileIndex = oldGroup ? oldGroup.tiles.findIndex(t => t.id === tileId) : -1;

        if (tileIndex !== -1) {
            const tile = oldGroup.tiles[tileIndex];

            tile.title = title;
            tile.url = url;
            tile.icon = icon;

            // Move the tile only when the group changes.
            if (oldGroupId !== newGroupId) {
                oldGroup.tiles.splice(tileIndex, 1);

                const newGroup = currentConfig.groups.find(g => g.id === newGroupId);
                if (newGroup) {
                    newGroup.tiles.push(tile);
                }
            }
        }
    } else {
        const targetGroup = currentConfig.groups.find(g => g.id === newGroupId);

        if (targetGroup) {
            targetGroup.tiles.push({
                id: 'tile-' + Date.now(),
                title: title,
                url: url,
                icon: icon
            });
        }
    }

    const modalEl = document.getElementById('modal-tile');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    saveConfig();
}

function deleteTile(groupId, tileId) {
    const group = currentConfig.groups.find(g => g.id === groupId);
    if (!group) return;
    group.tiles = group.tiles.filter(t => t.id !== tileId);
    saveConfig();
}
