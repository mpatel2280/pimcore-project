/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search');

/**
 * @private
 */
pimcore.bundle.search = Class.create({
    registry: null,

    initialize: function () {
        document.addEventListener(pimcore.events.preRegisterKeyBindings, this.registerKeyBinding.bind(this));
        document.addEventListener(pimcore.events.preMenuBuild, this.preMenuBuild.bind(this));
        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    pimcoreReady: function () {
        this.registerSearchService();
    },

    registerKeyBinding: function () {
        pimcore.helpers.keyBindingMapping.quickSearch = function () {
            pimcore.globalmanager.get('searchImplementationRegistry').showQuickSearch();
        }
    },

    registerSearchService: function () {
        this.searchRegistry = pimcore.globalmanager.get('searchImplementationRegistry');

        //register search/selector
        this.searchRegistry.registerImplementation(new pimcore.bundle.search.element.service());
    },

    preMenuBuild: function (event) {
        new pimcore.bundle.search.layout.toolbar(event.detail.menu); //TODO: check if that works
    }
});

const searchBundle = new pimcore.bundle.search();


/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

/**
 * @private
 */
pimcore.registerNS('pimcore.bundle.search.element.service');

pimcore.bundle.search.element.service = Class.create({
    initialize: function () {
        this.initKeyMap();
        this.createQuickSearch();
    },

    openItemSelector: function (multiselect, callback, restrictions, config) {
        new pimcore.bundle.search.element.selector.selector(multiselect, callback, restrictions, config);
    },

    initKeyMap: function () {
        new Ext.util.KeyMap({
            target: document,
            binding: [{
                key:  Ext.event.Event.ESC,
                fn: function () {
                    this.hideQuickSearch();
                }.bind(this)
            }, {
                key: Ext.event.Event.SPACE,
                ctrl: true,
                fn: function (keyCode, e) {
                    e.stopEvent();
                    this.showQuickSearch();
                }.bind(this)
            }]
        });
    },

    getStore: function () {
        return new Ext.data.Store({
            proxy: {
                type: 'ajax',
                url: Routing.generate('pimcore_bundle_search_search_quicksearch'),
                reader: {
                    type: 'json',
                    rootProperty: 'data'
                }
            },
            listeners: {
                "beforeload": function (store) {
                    var previewEl = Ext.get('pimcore_quicksearch_preview');
                    if(previewEl) {
                        previewEl.setHtml('');
                    }

                    store.getProxy().abort();
                }
            },
            fields: ["id", 'type', "subtype", "className", "fullpath"]
        });
    },

    getTemplate: function () {
        return new Ext.XTemplate(
            '<tpl for=".">',
            '<li role="option" unselectable="on" class="x-boundlist-item">' +
            '<div class="list-icon {iconCls}"><tpl if="icon"><img class="class-icon" src="{icon}"></tpl></div>' +
            '<div class="list-path" title="{fullpath}">{fullpathList}</div>' +
            '</li>',
            '</tpl>'
        );
    },

    createQuickSearch: function () {
        const quickSearchStore = this.getStore();
        const quickSearchTpl = this.getTemplate();

        const quickSearchContainer = Ext.get('pimcore_quicksearch');
        const quickSearchCombo = Ext.create('Ext.form.ComboBox', {
            width: 900,
            hideTrigger: true,
            border: false,
            shadow: false,
            tpl: quickSearchTpl,
            listConfig: {
                shadow: false,
                border: false,
                cls: 'pimcore_quicksearch_picker',
                navigationModel: 'quicksearch.boundlist',
                listeners: {
                    "highlightitem": function (view, node, opts) {
                        const record = quickSearchStore.getAt(node.dataset.recordindex);
                        if (!record.get('preview')) {
                            Ext.Ajax.request({
                                url: Routing.generate('pimcore_bundle_search_search_quicksearch_by_id'),
                                method: 'GET',
                                params: {
                                    "id": record.get('id'),
                                    "type": record.get('type')
                                },
                                success: function (response) {
                                    const result = Ext.decode(response.responseText);

                                    record.preview = result.preview;
                                    Ext.get('pimcore_quicksearch_preview').setHtml(result.preview);
                                },
                                failure: function () {
                                    const previewHtml = '<div class="no_preview">' + t('preview_not_available') + '</div>';

                                    Ext.get('pimcore_quicksearch_preview').setHtml(previewHtml);
                                }
                            });
                        } else {
                            let previewHtml = record.get('preview');
                            if(!previewHtml) {
                                previewHtml = '<div class="no_preview">' + t('preview_not_available') + '</div>';
                            }

                            Ext.get('pimcore_quicksearch_preview').setHtml(previewHtml);
                        }
                    }
                }
            },
            id: 'quickSearchCombo',
            store: quickSearchStore,
            loadingText: t('searching'),
            queryDelay: 100,
            minChars: 4,
            renderTo: quickSearchContainer,
            enableKeyEvents: true,
            displayField: 'fullpath',
            valueField: "id",
            typeAhead: true,
            listeners: {
                "expand": function (combo) {
                    if(!document.getElementById('pimcore_quicksearch_preview')) {
                        combo.getPicker().getEl().insertHtml('beforeEnd', '<div id="pimcore_quicksearch_preview"></div>');
                    }
                },
                "keyup": function (field) {
                    if(field.getValue()) {
                        quickSearchContainer.addCls('filled');
                    }
                },
                "select": function (combo, record, index) {
                    pimcore.helpers.openElement(record.get('id'), record.get('type'), record.get('subtype'));
                    this.hideQuickSearch();
                }.bind(this)
            }
        });

        Ext.getBody().on('click', function (event) {
            // hide on click outside
            if(quickSearchContainer && !quickSearchContainer.isAncestor(event.target)) {
                const pickerEl = quickSearchCombo.getPicker().getEl();
                if(!pickerEl || !pickerEl.isAncestor(event.target)) {
                    this.hideQuickSearch();
                }
            }
        }.bind(this));
    },

    showQuickSearch: function () {
        // close all windows, tooltips and previews
        // we use each() because .hideAll() doesn't hide the modal (seems to be an ExtJS bug)
        Ext.WindowManager.each(function (win) {
            win.close();
        });
        pimcore.helpers.treeNodeThumbnailPreviewHide();
        pimcore.helpers.treeToolTipHide();

        const quickSearchContainer = Ext.get('pimcore_quicksearch');
        quickSearchContainer.show();
        quickSearchContainer.removeCls('filled');

        const combo = Ext.getCmp('quickSearchCombo');
        combo.reset();
        combo.focus();

        Ext.get('pimcore_body').addCls('blurry');
        Ext.get('pimcore_sidebar').addCls('blurry');
        const elem = document.createElement('div');
        elem.id = 'pimcore_quickSearch_overlay';
        elem.style.cssText = 'position:absolute;width:100vw;height:100vh;z-index:100;top:0;left:0;opacity:0';
        elem.addEventListener('click', function(e) {
            document.body.removeChild(elem);
            this.hideQuickSearch();
        }.bind(this));
        document.body.appendChild(elem);
    },

    hideQuickSearch: function () {
        const quickSearchContainer = Ext.get('pimcore_quicksearch');
        quickSearchContainer.hide();
        Ext.get('pimcore_body').removeCls('blurry');
        Ext.get('pimcore_sidebar').removeCls('blurry');
        if (Ext.get('pimcore_quickSearch_overlay')) {
            Ext.get('pimcore_quickSearch_overlay').remove();
        }
    },

    getObjectRelationInlineSearchRoute: function () {
        return Routing.generate('pimcore_bundle_search_dataobject_relation_objects_list');
    }
});


/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search.element.selector.abstract');

/**
 * @private
 */
pimcore.bundle.search.element.selector.abstract = Class.create({
    initialize: function (parent) {
        this.parent = parent;

        this.initStore();

        if(this.parent.multiselect) {
            this.searchPanel = new Ext.Panel({
                layout: "border",
                items: [this.getForm(), this.getSelectionPanel(), this.getResultPanel()]
            });
        } else {
            this.searchPanel = new Ext.Panel({
                layout: "border",
                items: [this.getForm(), this.getResultPanel()]
            });
        }

        const user = pimcore.globalmanager.get("user");
        if(user.isAllowed("tags_search")) {
            this.searchPanel.add(this.getTagsPanel());
        }


        this.parent.setSearch(this.searchPanel);
    },

    addToSelection: function (data) {
        // check for dublicates
        const existingItem = this.selectionStore.find("id", data.id);

        if(existingItem < 0) {
            this.selectionStore.add(data);
        }
    },

    removeFromSelection: function(data) {
        // check if element exists in store
        const existingItem = this.selectionStore.find("id", data.id);

        if (existingItem >= 0) {
            this.selectionStore.removeAt(existingItem);
        }
    },

    getTagsPanel: function() {
        if(!this.tagsPanel) {
            const considerAllChildTags = Ext.create("Ext.form.Checkbox", {
                style: "margin-bottom: 0; margin-left: 5px",
                fieldStyle: "margin-top: 0",
                cls: "tag-tree-topbar",
                boxLabel: t("consider_child_tags"),
                listeners: {
                    change: function (field, checked) {
                        var proxy = this.store.getProxy();
                        proxy.setExtraParam("considerChildTags", checked);
                        this.search();
                    }.bind(this)
                }
            });


            const tree = new pimcore.element.tag.tree();
            tree.setAllowAdd(false);
            tree.setAllowDelete(false);
            tree.setAllowDnD(false);
            tree.setAllowRename(false);
            tree.setShowSelection(true);
            tree.setCheckChangeCallback(function(tree) {
                var tagIds = tree.getCheckedTagIds();
                var proxy = this.store.getProxy();
                proxy.setExtraParam("tagIds[]", tagIds);
                this.search();
            }.bind(this, tree));

            this.tagsPanel = Ext.create("Ext.Panel", {
                region: "west",
                width: 300,
                collapsedCls: "tag-tree-toolbar-collapsed",
                collapsible: true,
                collapsed: true,
                autoScroll: true,
                items: [tree.getLayout()],
                title: t('filter_tags'),
                tbar: [considerAllChildTags],
                iconCls: "pimcore_icon_element_tags",
                resizable: {
                    dynamic: true
                }
            });
        }

        return this.tagsPanel;
    },

    getData: function () {
        if(this.parent.multiselect) {
            this.tmpData = [];

            if(this.selectionStore.getCount() > 0) {
                this.selectionStore.each(function (rec) {
                    this.tmpData.push(rec.data);
                }.bind(this));

                return this.tmpData;
            } else {
                // is the store is empty and a item is selected take this
                const selected = this.getGrid().getSelectionModel().getSelected();
                if(selected) {
                    this.tmpData.push(selected.data);
                }
            }

            return this.tmpData;
        } else {
            const selected = this.getGrid().getSelectionModel().getSelected();
            if(selected) {
                return selected.getAt(0).data;
            }
            return null;
        }
    },

    getPagingToolbar: function() {
        const pagingToolbar = pimcore.helpers.grid.buildDefaultPagingToolbar(this.store);
        return pagingToolbar;
    },

    onRowContextmenu: function (grid, record, tr, rowIndex, e, eOpts ) {
        const menu = new Ext.menu.Menu();
        const data = grid.getStore().getAt(rowIndex);

        menu.add(new Ext.menu.Item({
            text: t('add'),
            iconCls: "pimcore_icon_add",
            handler: function (data) {
                var selModel = grid.getSelectionModel();
                var selectedRows = selModel.getSelection();
                for (var i = 0; i < selectedRows.length; i++) {
                    this.addToSelection(selectedRows[i].data);
                }

            }.bind(this, data)
        }));

        e.stopEvent();
        menu.showAt(e.getXY());
    },

    getGridSelModel: function() {
        return Ext.create('Ext.selection.RowModel', {mode: (this.parent.multiselect ? "MULTI" : "SINGLE")});
    },

    updateTabTitle: function(term) {
        if(this.parent.tabPanel) {
            this.parent.tabPanel.setTitle(t('search') + ': <i>' + term + '</i>');
        }
    }
});



/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search.element.selector.asset');

/**
 * @private
 */
pimcore.bundle.search.element.selector.asset = Class.create(pimcore.bundle.search.element.selector.abstract, {
    initStore: function () {
        this.store = new Ext.data.Store({
            autoDestroy: true,
            remoteSort: true,
            pageSize: 50,
            proxy : {
                type: 'ajax',
                url: Routing.generate('pimcore_bundle_search_search_find'),
                reader: {
                    type: 'json',
                    rootProperty: 'data'
                },
                extraParams: {
                    type: 'asset'
                }
            },
            fields: ["id","fullpath","type","subtype","filename"]
        });
    },

    getTabTitle: function() {
        return "asset_search";
    },

    getForm: function () {
        const compositeConfig = {
            xtype: "toolbar",
            items: [{
                xtype: "textfield",
                name: "query",
                width: 370,
                hideLabel: true,
                enableKeyEvents: true,
                listeners: {
                    "keydown" : function (field, key) {
                        if (key.getKey() == key.ENTER) {
                            this.search();
                        }
                    }.bind(this),
                    afterrender: function () {
                        this.focus(true,500);
                    }
                }
            }, new Ext.Button({
                handler: function () {
                    window.open("http://dev.mysql.com/doc/refman/5.6/en/fulltext-boolean.html");
                },
                iconCls: "pimcore_icon_help"
            })]
        };

        // check for restrictions
        let possibleRestrictions = pimcore.globalmanager.get('asset_search_types');
        let filterStore = [];
        let selectedStore = [];
        for (let i=0; i<possibleRestrictions.length; i++) {
            if(this.parent.restrictions.subtype.asset && in_array(possibleRestrictions[i],
                this.parent.restrictions.subtype.asset )) {
                filterStore.push([possibleRestrictions[i], t(possibleRestrictions[i])]);
                selectedStore.push(possibleRestrictions[i]);
            }
        }

        // add all to store if empty
        if(filterStore.length < 1) {
            for (let i=0; i<possibleRestrictions.length; i++) {
                filterStore.push([possibleRestrictions[i], t(possibleRestrictions[i])]);
                selectedStore.push(possibleRestrictions[i]);
            }
        }

        var selectedValue = selectedStore.join(",");
        if(filterStore.length > 1) {
            filterStore.splice(0,0,[selectedValue, t("all_types")]);
        }

        compositeConfig.items.push({
            xtype: "combo",
            store: filterStore,
            mode: "local",
            name: "subtype",
            triggerAction: "all",
            editable: false,
            value: selectedValue
        });

        // add button
        compositeConfig.items.push({
            xtype: "button",
            text: t("search"),
            iconCls: "pimcore_icon_search",
            handler: this.search.bind(this)
        });

        if(!this.formPanel) {
            this.formPanel = new Ext.form.FormPanel({
                region: "north",
                bodyStyle: "padding: 2px;",
                items: [compositeConfig]
            });
        }

        return this.formPanel;
    },

    getSelectionPanel: function () {
        if(!this.selectionPanel) {

            this.selectionStore = new Ext.data.JsonStore({
                data: [],
                fields: ["id", "type", "filename", "fullpath", "subtype"]
            });

            this.selectionPanel = new Ext.grid.GridPanel({
                region: "east",
                title: t("your_selection"),
                tbar: [{
                    xtype: "tbtext",
                    text: t("double_click_to_add_item_to_selection"),
                    autoHeight: true,
                    style: {
                        whiteSpace: "normal"
                    }
                }],
                tbarCfg: {
                    autoHeight: true
                },
                width: 300,
                store: this.selectionStore,
                columns: [
                    {text: t("type"), width: 40, sortable: true, dataIndex: 'subtype', renderer:
                            function (value, metaData, record, rowIndex, colIndex, store) {
                                return '<div style="height: 16px;" class="pimcore_icon_asset pimcore_icon_' + value
                                    + '" name="' + t(record.data.subtype) + '">&nbsp;</div>';
                            }
                    },
                    {text: t("filename"), flex: 1, sortable: true, dataIndex: 'filename'}
                ],
                viewConfig: {
                    forceFit: true
                },
                listeners: {
                    rowcontextmenu: function (grid, record, tr, rowIndex, e, eOpts ) {
                        var menu = new Ext.menu.Menu();

                        menu.add(new Ext.menu.Item({
                            text: t('remove'),
                            iconCls: "pimcore_icon_delete",
                            handler: function (index, item) {

                                if(this.parent.multiselect) {
                                    var resultPanelStore = this.resultPanel.getStore();
                                    var elementId = this.selectionStore.getAt(index).id;
                                    var record = resultPanelStore.findRecord("id", elementId);

                                    if(record) {
                                        record.set('asset-selected', false);
                                    }

                                    resultPanelStore.reload();

                                }

                                this.selectionStore.removeAt(index);
                                item.parentMenu.destroy();
                            }.bind(this, rowIndex)
                        }));

                        e.stopEvent();
                        menu.showAt(e.getXY());
                    }.bind(this)
                },
                selModel: Ext.create('Ext.selection.RowModel', {}),
                bbar: ["->", {
                    text: t("select"),
                    iconCls: "pimcore_icon_apply",
                    handler: function () {
                        this.parent.commitData(this.getData());
                    }.bind(this)
                }]
            });
        }

        return this.selectionPanel;
    },

    getResultPanel: function () {
        if (!this.resultPanel) {
            const columns = [
                {text: t("type"), width: 40, sortable: true, dataIndex: 'subtype',
                    renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                        return '<div style="height: 16px;" class="pimcore_icon_'
                            + value + '" name="' + t(record.data.subtype) + '">&nbsp;</div>';
                    }
                },
                {text: 'ID', width: 40, sortable: true, dataIndex: 'id', hidden: true},
                {text: t("path"), flex: 200, sortable: true, dataIndex: 'fullpath', renderer: Ext.util.Format.htmlEncode},
                {text: t("filename"), width: 200, sortable: true, dataIndex: 'filename', hidden: true, renderer: Ext.util.Format.htmlEncode},
                {text: t("preview"), width: 150, sortable: false, dataIndex: 'subtype',
                    renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                        const routes = {
                            image: "pimcore_admin_asset_getimagethumbnail",
                            video: "pimcore_admin_asset_getvideothumbnail",
                            document: "pimcore_admin_asset_getdocumentthumbnail"
                        };

                        if (record.data.subtype in routes) {
                            const route = routes[record.data.subtype];

                            const params = {
                                id: record.data.id,
                                width: 100,
                                height: 100,
                                cover: true,
                                aspectratio: true
                            };

                            const uri = Routing.generate(route, params);

                            return '<div name="' + t(record.data.subtype)
                                + '"><img src="' + uri + '" /></div>';
                        }
                    }
                }
            ];

            if (this.parent.multiselect) {
                columns.unshift(
                    {
                        xtype: 'checkcolumn',
                        fieldLabel: '',
                        name: 'asset-select-checkbox',
                        text: t("select"),
                        dataIndex : 'asset-selected',
                        sortable: false,
                        renderer: function (value, metaData, record, rowIndex) {
                            const currentElementId = this.resultPanel.getStore().getAt(rowIndex).id;
                            const rec = this.selectionStore.getData().find("id", currentElementId);

                            const checkbox = new Ext.grid.column.Check();

                            if (typeof value ==='undefined' && rec !== null){
                                this.resultPanel.getStore().getAt(rowIndex).set('asset-selected', true);
                                return checkbox.renderer(true);
                            }

                            if (value && rec === null) {
                                return checkbox.renderer(true);
                            }

                            return checkbox.renderer(false);
                        }.bind(this)
                    }
                );
            }

            this.pagingtoolbar = this.getPagingToolbar();

            this.resultPanel = new Ext.grid.GridPanel({
                region: "center",
                store: this.store,
                columns: columns,
                loadMask: true,
                columnLines: true,
                stripeRows: true,
                viewConfig: {
                    forceFit: true,
                    markDirty: false,
                    listeners: {
                        refresh: function (dataview) {
                            Ext.each(dataview.panel.columns, function (column) {
                                if (column.autoSizeColumn === true) {
                                    column.autoSize();
                                }
                            })
                        }
                    }
                },
                plugins: ['gridfilters'],
                selModel: this.getGridSelModel(),
                bbar: this.pagingtoolbar,
                listeners: {
                    cellclick: {
                        fn: function(view, cellEl, colIdx, store, rowEl, rowIdx, event) {

                            var data = view.getStore().getAt(rowIdx);

                            if (this.parent.multiselect && colIdx == 0) {
                                if (data.get('asset-selected')) {
                                    this.addToSelection(data.data);
                                } else {
                                    this.removeFromSelection(data.data);
                                }
                            }
                        }.bind(this)
                    },
                    rowdblclick: function (grid, record, tr, rowIndex, e, eOpts ) {

                        var data = grid.getStore().getAt(rowIndex);

                        if(this.parent.multiselect) {
                            this.addToSelection(data.data);

                            if (!record.get('asset-selected')) {
                                record.set('asset-selected', true);
                            }

                        } else {
                            // select and close
                            this.parent.commitData(this.getData());
                        }
                    }.bind(this)
                }
            });
        }


        if(this.parent.multiselect) {
            this.resultPanel.on("rowcontextmenu", this.onRowContextmenu.bind(this));
        }

        return this.resultPanel;
    },

    getGrid: function () {
        return this.resultPanel;
    },

    search: function () {
        let formValues = this.formPanel.getForm().getFieldValues();

        let proxy = this.store.getProxy();
        let query = Ext.util.Format.htmlEncode(formValues.query);
        proxy.setExtraParam("query", query);
        proxy.setExtraParam("type", 'asset');
        proxy.setExtraParam("subtype", formValues.subtype);

        if (this.parent.config && this.parent.config.context) {
            proxy.setExtraParam("context", Ext.encode(this.parent.config.context));
        }

        this.pagingtoolbar.moveFirst();
        this.updateTabTitle(query);
    }
});



/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search.element.selector.document');

/**
 * @private
 */
pimcore.bundle.search.element.selector.document = Class.create(pimcore.bundle.search.element.selector.abstract, {
    initStore: function () {
        this.store = new Ext.data.Store({
            autoDestroy: true,
            remoteSort: true,
            pageSize: 50,
            proxy : {
                type: 'ajax',
                url: Routing.generate('pimcore_bundle_search_search_find'),
                reader: {
                    type: 'json',
                    rootProperty: 'data'
                },
                extraParams: {
                    type: 'document'
                }
            },
            fields: ["id", "fullpath", "type", "subtype", "published", "title", "description", "name", "filename"]
        });
    },

    getTabTitle: function() {
        return "document_search";
    },

    getForm: function () {
        const compositeConfig = {
            xtype: "toolbar",
            items: [{
                xtype: "textfield",
                name: "query",
                width: 370,
                hideLabel: true,
                enableKeyEvents: true,
                listeners: {
                    "keydown" : function (field, key) {
                        if (key.getKey() == key.ENTER) {
                            this.search();
                        }
                    }.bind(this),
                    afterrender: function () {
                        this.focus(true,500);
                    }
                }
            }, new Ext.Button({
                handler: function () {
                    window.open("http://dev.mysql.com/doc/refman/5.6/en/fulltext-boolean.html");
                },
                iconCls: "pimcore_icon_help"
            })]
        };

        // check for restrictions
        let possibleRestrictions = pimcore.globalmanager.get('document_search_types');
        let filterStore = [];
        let selectedStore = [];
        for (let i=0; i<possibleRestrictions.length; i++) {
            if(this.parent.restrictions.subtype.document && in_array(possibleRestrictions[i],
                this.parent.restrictions.subtype.document )) {
                filterStore.push([possibleRestrictions[i], t(possibleRestrictions[i])]);
                selectedStore.push(possibleRestrictions[i]);
            }
        }

        // add all to store if empty
        if(filterStore.length < 1) {
            for (let i=0; i<possibleRestrictions.length; i++) {
                filterStore.push([possibleRestrictions[i], t(possibleRestrictions[i])]);
                selectedStore.push(possibleRestrictions[i]);
            }
        }

        let selectedValue = selectedStore.join(",");
        if(filterStore.length > 1) {
            filterStore.splice(0,0,[selectedValue, t("all_types")]);
        }


        compositeConfig.items.push({
            xtype: "combo",
            store: filterStore,
            mode: "local",
            name: "subtype",
            triggerAction: "all",
            editable: false,
            value: selectedValue
        });


        // add button
        compositeConfig.items.push({
            xtype: "button",
            iconCls: "pimcore_icon_search",
            text: t("search"),
            handler: this.search.bind(this)
        });

        if(!this.formPanel) {
            this.formPanel = new Ext.form.FormPanel({
                region: "north",
                bodyStyle: "padding: 2px;",
                items: [compositeConfig]
            });
        }

        return this.formPanel;
    },

    getSelectionPanel: function () {
        if(!this.selectionPanel) {

            this.selectionStore = new Ext.data.JsonStore({
                data: [],
                fields: ["id", "type", "filename", "fullpath", "subtype"]
            });

            this.selectionPanel = new Ext.grid.GridPanel({
                region: "east",
                title: t("your_selection"),
                tbar: [{
                    xtype: "tbtext",
                    text: t("double_click_to_add_item_to_selection"),
                    autoHeight: true,
                    style: {
                        whiteSpace: "normal"
                    }
                }],
                tbarCfg: {
                    autoHeight: true
                },
                width: 300,
                store: this.selectionStore,
                columns: [
                    {text: t("type"), width: 40, sortable: true, dataIndex: 'subtype',
                        renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                            return '<div class="pimcore_icon_' + value + '" name="' + t(record.data.subtype) + '">&nbsp;</div>';
                        }
                    },
                    {text: t("filename"), flex: 1, sortable: true, dataIndex: 'filename'}
                ],
                viewConfig: {
                    forceFit: true
                },
                listeners: {
                    rowcontextmenu: function (grid, record, tr, rowIndex, e, eOpts ) {
                        var menu = new Ext.menu.Menu();

                        menu.add(new Ext.menu.Item({
                            text: t('remove'),
                            iconCls: "pimcore_icon_delete",
                            handler: function (index, item) {
                                this.selectionStore.removeAt(index);
                                item.parentMenu.destroy();
                            }.bind(this, rowIndex)
                        }));

                        e.stopEvent();
                        menu.showAt(e.getXY());
                    }.bind(this)
                },
                selModel: Ext.create('Ext.selection.RowModel', {}),
                bbar: ["->", {
                    text: t("select"),
                    iconCls: "pimcore_icon_apply",
                    handler: function () {
                        this.parent.commitData(this.getData());
                    }.bind(this)
                }]
            });
        }

        return this.selectionPanel;
    },

    getResultPanel: function () {
        if (!this.resultPanel) {
            const columns = [
                {text: t("type"), width: 40, sortable: true, dataIndex: 'subtype',
                    renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                        return '<div class="pimcore_icon_' + value + '" name="' + t(record.data.subtype) + '">&nbsp;</div>';
                    }
                },
                {text: 'ID', width: 40, sortable: true, dataIndex: 'id', hidden: true},
                {text: t("published"), width: 40, sortable: true, dataIndex: 'published', hidden: true},
                {text: t("path"), flex: 200, sortable: true, dataIndex: 'fullpath'},
                {
                    text: t("title"),
                    flex: 200,
                    sortable: false,
                    dataIndex: 'title',
                    hidden: false,
                    renderer: function (value) {
                        return Ext.util.Format.htmlEncode(value);
                    }
                },
                {text: t("description"), width: 200, sortable: false, dataIndex: 'description', hidden: true},
                {text: t("filename"), width: 200, sortable: true, dataIndex: 'filename', hidden: true}
            ];

            this.pagingtoolbar = this.getPagingToolbar();

            this.resultPanel = new Ext.grid.GridPanel({
                region: "center",
                store: this.store,
                columns: columns,
                viewConfig: {
                    forceFit: true,
                    listeners: {
                        refresh: function (dataview) {
                            Ext.each(dataview.panel.columns, function (column) {
                                if (column.autoSizeColumn === true) {
                                    column.autoSize();
                                }
                            })
                        }
                    }
                },
                loadMask: true,
                columnLines: true,
                stripeRows: true,
                selModel: this.getGridSelModel(),
                bbar: this.pagingtoolbar,
                listeners: {
                    rowdblclick: function (grid, record, tr, rowIndex, e, eOpts ) {

                        const data = grid.getStore().getAt(rowIndex);

                        if(this.parent.multiselect) {
                            this.addToSelection(data.data);
                        } else {
                            // select and close
                            this.parent.commitData(this.getData());
                        }
                    }.bind(this)
                }
            });
        }

        if(this.parent.multiselect) {
            this.resultPanel.on("rowcontextmenu", this.onRowContextmenu.bind(this));
        }

        return this.resultPanel;
    },

    getGrid: function () {
        return this.resultPanel;
    },

    search: function () {
        let formValues = this.formPanel.getForm().getFieldValues();

        let proxy = this.store.getProxy();
        let query = Ext.util.Format.htmlEncode(formValues.query);
        proxy.setExtraParam("query", query);
        proxy.setExtraParam("type", 'document');
        proxy.setExtraParam("subtype", formValues.subtype);

        if (this.parent.config && this.parent.config.context) {
            proxy.setExtraParam("context", Ext.encode(this.parent.config.context));
        }

        this.pagingtoolbar.moveFirst();
        this.updateTabTitle(query);
    }
});



/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search.element.selector.object');

/**
 * @private
 */
pimcore.bundle.search.element.selector.object = Class.create(pimcore.bundle.search.element.selector.abstract, {
    fieldObject: {},
    gridType: 'object',

    initStore: function () {
        return 0; // dummy
    },

    getTabTitle: function() {
        return "object_search";
    },

    getForm: function () {
        let i;

        //set "Home" object ID for search grid column configuration
        this.object  = {};
        this.object.id = 1;

        this.searchType = "search";

        const compositeConfig = {
            xtype: "toolbar",
            items: [{
                xtype: "textfield",
                name: "query",
                width: 340,
                hideLabel: true,
                enableKeyEvents: true,
                listeners: {
                    "keydown" : function (field, key) {
                        if (key.getKey() == key.ENTER) {
                            this.search();
                        }
                    }.bind(this),
                    afterrender: function () {
                        this.focus(true,500);
                    }
                }
            }, new Ext.Button({
                handler: function () {
                    window.open("http://dev.mysql.com/doc/refman/5.6/en/fulltext-boolean.html");
                },
                iconCls: "pimcore_icon_help"
            })]
        };

        // check for restrictions
        let possibleRestrictions = pimcore.globalmanager.get('object_search_types');
        let filterStore = [];
        let selectedStore = [];
        for (i=0; i<possibleRestrictions.length; i++) {
            if(this.parent.restrictions.subtype.object && in_array(possibleRestrictions[i], this.parent.restrictions.subtype.object )) {
                filterStore.push([possibleRestrictions[i], t(possibleRestrictions[i])]);
                selectedStore.push(possibleRestrictions[i]);
            }
        }

        // add all to store if empty
        if(filterStore.length < 1) {
            for (let i=0; i<possibleRestrictions.length; i++) {
                filterStore.push([possibleRestrictions[i], t(possibleRestrictions[i])]);
                selectedStore.push(possibleRestrictions[i]);
            }
        }

        let selectedValue = selectedStore.join(",");
        if(filterStore.length > 1) {
            filterStore.splice(0,0,[selectedValue, t("all_types")]);
        }

        compositeConfig.items.push({
            xtype: "combo",
            store: filterStore,
            queryMode: "local",
            name: "subtype",
            triggerAction: "all",
            editable: true,
            typeAhead:true,
            forceSelection: true,
            selectOnFocus: true,
            value: selectedValue,
            listeners: {
                select: function(e) {
                    if (e.value === 'folder') {
                        const defaultRecord = this.classChangeCombo.getStore().getAt(0);
                        this.classChangeCombo.setValue(defaultRecord.get(this.classChangeCombo.valueField));
                        this.classChangeCombo.fireEvent('select', this.classChangeCombo, defaultRecord);

                        this.classChangeCombo.setDisabled(true);
                    } else {
                        this.classChangeCombo.setDisabled(false);
                    }
                }.bind(this)
            }
        });


        // classes
        var possibleClassRestrictions = [];
        var classStore = pimcore.globalmanager.get("object_types_store");
        classStore.each(function (rec) {
            possibleClassRestrictions.push(rec.data.text);
        });

        var filterClassStore = [];
        var selectedClassStore = [];
        for (i=0; i<possibleClassRestrictions.length; i++) {
            if(in_array(possibleClassRestrictions[i], this.parent.restrictions.specific.classes )) {
                filterClassStore.push([possibleClassRestrictions[i], t(possibleClassRestrictions[i])]);
                selectedClassStore.push(possibleClassRestrictions[i]);
            }
        }

        // add all to store if empty
        if(filterClassStore.length < 1) {
            for (i=0; i<possibleClassRestrictions.length; i++) {
                filterClassStore.push([possibleClassRestrictions[i], possibleClassRestrictions[i]]);
                selectedClassStore.push(possibleClassRestrictions[i]);
            }
        }

        var selectedClassValue = selectedClassStore.join(",");
        if(filterClassStore.length > 1) {
            filterClassStore.splice(0,0,[selectedClassValue, t("all_types")]);
        }

        this.classChangeCombo = new Ext.form.ComboBox({
            store: filterClassStore,
            queryMode: "local",
            name: "class",
            triggerAction: "all",
            editable: true,
            typeAhead: true,
            forceSelection: true,
            selectOnFocus: true,
            value: selectedClassValue,
            listeners: {
                select: this.changeClass.bind(this)
            }
        });
        if(selectedValue == 'folder') {
            this.classChangeCombo.setDisabled(true);
        }

        compositeConfig.items.push(this.classChangeCombo);


        // add button
        compositeConfig.items.push({
            xtype: "button",
            iconCls: "pimcore_icon_search",
            text: t("search"),
            handler: this.search.bind(this)
        });

        this.saveColumnConfigButton = new Ext.Button({
            tooltip: t('save_grid_options'),
            iconCls: "pimcore_icon_publish",
            hidden: true,
            handler: function () {
                var asCopy = !(this.settings.gridConfigId > 0);
                this.saveConfig(asCopy)
            }.bind(this)
        });

        this.columnConfigButton = new Ext.SplitButton({
            text: t('grid_options'),
            hidden: true,
            iconCls: "pimcore_icon_table_col pimcore_icon_overlay_edit",
            handler: function () {
                this.openColumnConfig(this.selectedClass, this.classId);
            }.bind(this),
            menu: []
        });

        compositeConfig.items.push("->");

        // add grid config main button
        compositeConfig.items.push(this.columnConfigButton);

        // add grid config save button
        compositeConfig.items.push(this.saveColumnConfigButton);

        if(!this.formPanel) {
            this.formPanel = new Ext.form.FormPanel({
                region: "north",
                bodyStyle: "padding: 2px;",
                items: [compositeConfig]
            });
        }

        return this.formPanel;
    },

    getSelectionPanel: function () {
        if(!this.selectionPanel) {

            this.selectionStore = new Ext.data.JsonStore({
                data: [],
                fields: ["id", "type", "filename", "fullpath", "subtype", {name:"classname",renderer: function(v){
                        return t(v);
                    }}]
            });

            this.selectionPanel = new Ext.grid.GridPanel({
                region: "east",
                title: t("your_selection"),
                tbar: [{
                    xtype: "tbtext",
                    text: t("double_click_to_add_item_to_selection"),
                    autoHeight: true,
                    style: {
                        whiteSpace: "normal"
                    }
                }],
                tbarCfg: {
                    autoHeight: true
                },
                width: 300,
                store: this.selectionStore,
                columns: [
                    {text: t("type"), width: 40, sortable: true, dataIndex: 'subtype'},
                    {text: t("key"), flex: 1, sortable: true, dataIndex: 'filename'}
                ],
                viewConfig: {
                    forceFit: true
                },
                listeners: {
                    rowcontextmenu: function (grid, record, tr, rowIndex, e, eOpts ) {
                        const menu = new Ext.menu.Menu();

                        menu.add(new Ext.menu.Item({
                            text: t('remove'),
                            iconCls: "pimcore_icon_delete",
                            handler: function (index, item) {
                                this.selectionStore.removeAt(index);
                                item.parentMenu.destroy();
                            }.bind(this, rowIndex)
                        }));

                        e.stopEvent();
                        menu.showAt(e.getXY());
                    }.bind(this)
                },
                selModel: Ext.create('Ext.selection.RowModel', {}),
                bbar: ["->", {
                    text: t("select"),
                    iconCls: "pimcore_icon_apply",
                    handler: function () {
                        this.parent.commitData(this.getData());
                    }.bind(this)
                }]
            });
        }

        return this.selectionPanel;
    },

    getResultPanel: function () {
        if (!this.resultPanel) {
            this.resultPanel = new Ext.Panel({
                region: "center",
                layout: "fit"
            });

            this.resultPanel.on("afterrender", this.changeClass.bind(this));
        }

        return this.resultPanel;
    },


    changeClass: function () {
        const selectedClass = this.classChangeCombo.getValue();

        if(selectedClass.indexOf(",") > 0) { // multiple classes because of a comma in the string
            //hide column config buttons
            this.columnConfigButton.hide();
            this.saveColumnConfigButton.hide();

            // init default store
            this.initDefaultStore();
        } else {
            const classStore = pimcore.globalmanager.get("object_types_store");
            const classIdx = classStore.findExact("text", selectedClass);
            this.selectedClass = selectedClass
            this.classId = classStore.getAt(classIdx).id;
            this.settings = {};

            // get class definition
            Ext.Ajax.request({
                url: Routing.generate('pimcore_admin_dataobject_dataobjecthelper_gridgetcolumnconfig'),
                params: {
                    id: this.classId,
                    objectId: this.object.id,
                    gridtype: "search",
                    gridConfigId: this.settings ? this.settings.gridConfigId : null,
                    searchType: "search"
                },
                success: this.initClassStore.bind(this, selectedClass)
            });
        }
    },

    initClassStore: function (selectedClass, response, save) {
        let fields = [];
        if(response.responseText) {
            response = Ext.decode(response.responseText);
            fields = response.availableFields;
            this.gridLanguage = response.language;
            this.sortinfo = response.sortinfo;
            this.settings = response.settings;
            this.availableConfigs = response.availableConfigs;
            this.sharedConfigs = response.sharedConfigs;
        } else {
            fields = response;
        }

        this.itemsPerPage = pimcore.helpers.grid.getDefaultPageSize(-1);
        const gridHelper = new pimcore.object.helpers.grid(selectedClass, fields, Routing.generate('pimcore_bundle_search_search_find'), null, true);
        gridHelper.limit = this.itemsPerPage;
        this.store = gridHelper.getStore();
        this.store.setPageSize(this.itemsPerPage);
        this.applyExtraParamsToStore();
        var gridColumns = gridHelper.getGridColumns();
        var gridfilters = gridHelper.getGridFilters();

        this.fieldObject = {};
        for(var i = 0; i < fields.length; i++) {
            this.fieldObject[fields[i].key] = fields[i];
        }

        //TODO set up filter

        this.getGridPanel(gridColumns, gridfilters, selectedClass, save);

        this.buildColumnConfigMenu();
        this.columnConfigButton.show();
    },

    initDefaultStore: function () {
        this.itemsPerPage =  pimcore.helpers.grid.getDefaultPageSize(-1);
        this.store = new Ext.data.Store({
            autoDestroy: true,
            remoteSort: true,
            pageSize: this.itemsPerPage,
            proxy : {
                type: 'ajax',
                url: Routing.generate('pimcore_bundle_search_search_find'),
                reader: {
                    type: 'json',
                    rootProperty: 'data'
                },
                extraParams: {
                    type: 'object'
                }
            },
            fields: ["id","fullpath","type","subtype","filename",{name:"classname",convert: function(v, rec){
                    return t(rec.data.classname);
                }},"published"]
        });

        var columns = [
            {text: t("type"), width: 40, sortable: true, dataIndex: 'subtype',
                renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                    return '<div style="height: 16px;" class="pimcore_icon_' + value + '" name="'
                        + t(record.data.subtype) + '">&nbsp;</div>';
                }
            },
            {text: 'ID', width: 40, sortable: true, dataIndex: 'id', hidden: true},
            {text: t("published"), width: 40, sortable: true, dataIndex: 'published', hidden: true},
            {text: t("path"), flex: 200, sortable: true, dataIndex: 'fullpath', renderer: Ext.util.Format.htmlEncode},
            {text: t("key"), width: 200, sortable: true, dataIndex: 'filename', hidden: true, renderer: Ext.util.Format.htmlEncode},
            {text: t("class"), width: 200, sortable: true, dataIndex: 'classname'}
        ];


        this.getGridPanel(columns, null);
    },

    getGridPanel: function (columns, gridfilters, selectedClass, save) {
        this.pagingtoolbar = pimcore.helpers.grid.buildDefaultPagingToolbar(this.store,{pageSize: this.itemsPerPage});

        this.gridPanel = Ext.create('Ext.grid.Panel', {
            store: this.store,
            border: false,
            columns: columns,
            loadMask: true,
            columnLines: true,
            stripeRows: true,
            plugins: ['pimcore.gridfilters'],
            viewConfig: {
                forceFit: false,
                xtype: 'patchedgridview',
                listeners: {
                    refresh: function (dataview) {
                        Ext.each(dataview.panel.columns, function (column) {
                            if (column.autoSizeColumn === true) {
                                column.autoSize();
                            }
                        })
                    }
                }
            },
            cls: 'pimcore_object_grid_panel',
            selModel: this.getGridSelModel(),
            bbar: this.pagingtoolbar,
            listeners: {
                rowdblclick: function (grid, record, tr, rowIndex, e, eOpts ) {

                    var data = grid.getStore().getAt(rowIndex);

                    if(this.parent.multiselect) {
                        this.addToSelection(data.data);
                    } else {
                        // select and close
                        this.parent.commitData(this.getData());
                    }
                }.bind(this)
            }
        });

        this.gridPanel.on("afterrender", function (grid) {
            if(selectedClass) {

                const classStore = pimcore.globalmanager.get("object_types_store");
                let classId = null;
                classStore.each(function (rec) {
                    if(rec.data.text == selectedClass) {
                        classId = rec.data.id;
                    }
                });

                const columnConfig = new Ext.menu.Item({
                    text: t("grid_options"),
                    iconCls: "pimcore_icon_table_col pimcore_icon_overlay_edit",
                    handler: this.openColumnConfig.bind(this, selectedClass, classId)
                });
                const menu = grid.headerCt.getMenu();
                menu.add(columnConfig);
            }
        }.bind(this));

        if(this.parent.multiselect) {
            this.gridPanel.on("rowcontextmenu", this.onRowContextmenu.bind(this));
        }

        this.resultPanel.removeAll();
        this.resultPanel.add(this.gridPanel);
        this.resultPanel.updateLayout();

        if (save == true) {
            if (this.settings.isShared) {
                this.settings.gridConfigId = null;
            }
            this.saveConfig(false);
        }
    },

    openColumnConfig: function(selectedClass, classId) {
        const fields = this.getGridConfig().columns;
        const fieldKeys = Object.keys(fields);
        const visibleColumns = [];

        for(let i = 0; i < fieldKeys.length; i++) {
            const field = fields[fieldKeys[i]];
            if(!field.hidden) {
                var fc = {
                    key: fieldKeys[i],
                    label: field.fieldConfig.label,
                    dataType: field.fieldConfig.type,
                    layout: field.fieldConfig.layout
                };
                if (field.fieldConfig.width) {
                    fc.width = field.fieldConfig.width;
                }

                if (field.isOperator) {
                    fc.isOperator = true;
                    fc.attributes = field.fieldConfig.attributes;

                }

                visibleColumns.push(fc);
            }
        }

        let objectId;
        if(this["object"] && this.object["id"]) {
            objectId = this.object.id;
        }

        const columnConfig = {
            language: this.gridLanguage,
            classid: classId,
            selectedGridColumns: visibleColumns
        };

        const dialog = new pimcore.object.helpers.gridConfigDialog(columnConfig,
            function(data, settings, save) {
                this.saveColumnConfigButton.show(); //unhide save config button
                this.gridLanguage = data.language;
                this.itemsPerPage = data.pageSize;
                this.initClassStore(selectedClass, data.columns, save);
            }.bind(this),
            function() {
                Ext.Ajax.request({
                    url: Routing.generate('pimcore_admin_dataobject_dataobjecthelper_gridgetcolumnconfig'),
                    params: {
                        id: this.classId,
                        objectId: this.object.id,
                        gridtype: "search",
                        searchType: this.searchType
                    },
                    success: function(response) {
                        if (response) {
                            this.initClassStore(selectedClass, response, false);
                            if (typeof this.saveColumnConfigButton !== "undefined") {
                                this.saveColumnConfigButton.hide();
                            }
                        } else {
                            pimcore.helpers.showNotification(t("error"), t("error_resetting_config"),
                                "error",t(rdata.message));
                        }
                    }.bind(this),
                    failure: function () {
                        pimcore.helpers.showNotification(t("error"), t("error_resetting_config"), "error");
                    }
                });
            }.bind(this), true, this.settings,
            {
                allowPreview: true,
                classId: this.classId,
                objectId: this.object.id
            }
        );
    },

    getGridConfig : function () {
        const config = {
            language: this.gridLanguage,
            sortinfo: this.sortinfo,
            columns: {}
        };

        const cm = this.gridPanel.getView().getHeaderCt().getGridColumns();

        for (let i=0; i < cm.length; i++) {
            if(cm[i].dataIndex) {
                config.columns[cm[i].dataIndex] = {
                    name: cm[i].dataIndex,
                    position: i,
                    hidden: cm[i].hidden,
                    width: cm[i].width,
                    fieldConfig: this.fieldObject[cm[i].dataIndex],
                    isOperator: this.fieldObject[cm[i].dataIndex].isOperator
                };

            }
        }

        return config;
    },

    getGrid: function () {
        return this.gridPanel;
    },

    applyExtraParamsToStore: function () {
        let formValues = this.formPanel.getForm().getFieldValues();
        let proxy = this.store.getProxy();
        let query = Ext.util.Format.htmlEncode(formValues.query);
        proxy.setExtraParam("query", query);
        proxy.setExtraParam("type", 'object');
        proxy.setExtraParam("subtype", formValues.subtype);
        proxy.setExtraParam("class", formValues.class);

        if (this.gridLanguage) {
            proxy.setExtraParam("language", this.gridLanguage);
        }

        if (this.parent.config && this.parent.config.context) {
            proxy.setExtraParam("context", Ext.encode(this.parent.config.context));
        }

        this.updateTabTitle(query);
    },

    search: function () {
        this.applyExtraParamsToStore();
        this.pagingtoolbar.moveFirst();
    },

    createGrid: function (fromConfig, response, settings, save, context) {
        const selectedClass = this.classChangeCombo.getValue();

        this.initClassStore(selectedClass,response, save);
    },

    getTableDescription: function () {
        const selectedClass = this.classChangeCombo.getValue();

        if(selectedClass.indexOf(",") > 0) { // multiple classes because of a comma in the string
            // init default store
            this.initDefaultStore();
        } else {
            // get class definition
            Ext.Ajax.request({
                url: Routing.generate('pimcore_admin_dataobject_dataobjecthelper_gridgetcolumnconfig'),
                params: {
                    id: this.classId,
                    objectId: this.object.id,
                    gridtype: "search",
                    gridConfigId: this.settings ? this.settings.gridConfigId : null,
                    searchType: this.searchType
                },
                success: this.initClassStore.bind(this, selectedClass)
            });
        }
    },
});

pimcore.bundle.search.element.selector.object.addMethods(pimcore.element.helpers.gridColumnConfig);



/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search.element.selector.selector');

/**
 * @private
 */
pimcore.bundle.search.element.selector.selector = Class.create({
    initialize: function (multiselect, callback, restrictions, config) {
        this.initialRestrictions = restrictions ? restrictions: {};
        this.callback = callback;
        this.restrictions = restrictions;
        this.multiselect = multiselect;
        this.config = typeof config != "undefined" ? config : {};

        if(!this.multiselect) {
            this.multiselect = false;
        }

        const possibleClassRestrictions = [];
        const classStore = pimcore.globalmanager.get("object_types_store");
        classStore.each(function (rec) {
            possibleClassRestrictions.push(rec.data.text);
        });

        const restrictionDefaults = {
            type: ["document","asset","object"],
            subtype: {
                document: pimcore.globalmanager.get('document_search_types'),
                asset: pimcore.globalmanager.get('asset_search_types'),
                object: pimcore.globalmanager.get('object_search_types')
            },
            specific: {
                classes: possibleClassRestrictions // put here all classes from global class store ...
            }
        };

        if(!this.restrictions) {
            this.restrictions = restrictionDefaults;
        }

        this.restrictions = Ext.applyIf(this.restrictions, restrictionDefaults);

        if(!this.callback) {
            this.callback = function () {};
            //throw "";
        }

        this.panel = new Ext.Panel({
            tbar: this.getToolbar(),
            border: false,
            layout: "fit"
        });

        let windowWidth = 1000;
        if(this.multiselect) {
            windowWidth = 1250;
        }

        let title = t('search');
        let iconCls = 'pimcore_icon_search';
        if (this.restrictions.type && this.restrictions.type.length == 1) {
            title = t(this.restrictions.type[0] + '_search');
            iconCls = 'pimcore_icon_' + this.restrictions.type[0] + ' pimcore_icon_overlay_search'
        }

        if(this.config["asTab"]) {
            let myTabId = "pimcore_search_" + uniqid();
            this.tabPanel = new Ext.Panel({
                id: myTabId,
                iconCls: iconCls,
                title: title,
                border: false,
                layout: "fit",
                items: [this.panel],
                closable:true
            });

            const tabPanel = Ext.getCmp("pimcore_panel_tabs");
            tabPanel.add(this.tabPanel);
            tabPanel.setActiveItem(myTabId);

            this.tabPanel.add(this.panel);

            pimcore.layout.refresh();
        } else {
            this.window = new Ext.Window({
                width: windowWidth,
                height: 550,
                title: title,
                modal: true,
                layout: "fit",
                items: [this.panel]
            });
            this.window.show();
        }

        const user = pimcore.globalmanager.get("user");

        if(in_array("document", this.restrictions.type) && user.isAllowed("documents")) {
            this.searchDocuments();
        }
        else if(in_array("asset", this.restrictions.type) && user.isAllowed("assets")) {
            this.searchAssets();
        }
        else if(in_array("object", this.restrictions.type) && user.isAllowed("objects")) {
            this.searchObjects();
        }
    },

    getToolbar: function () {
        const user = pimcore.globalmanager.get("user");
        let toolbar;
        const items = [];
        this.toolbarbuttons = {};

        if(in_array("document", this.restrictions.type) && user.isAllowed("documents")) {
            this.toolbarbuttons.document = new Ext.Button({
                text: t("documents"),
                handler: this.searchDocuments.bind(this),
                iconCls: "pimcore_icon_document",
                enableToggle: true
            });
            items.push(this.toolbarbuttons.document);
        }

        if(in_array("asset", this.restrictions.type) && user.isAllowed("assets")) {
            items.push("-");
            this.toolbarbuttons.asset = new Ext.Button({
                text: t("assets"),
                handler: this.searchAssets.bind(this),
                iconCls: "pimcore_icon_asset",
                enableToggle: true
            });
            items.push(this.toolbarbuttons.asset);
        }

        if(in_array("object", this.restrictions.type) && user.isAllowed("objects")) {
            items.push("-");
            this.toolbarbuttons.object = new Ext.Button({
                text: t("data_objects"),
                handler: this.searchObjects.bind(this),
                iconCls: "pimcore_icon_object",
                enableToggle: true
            });
            items.push(this.toolbarbuttons.object);
        }

        if(items.length > 2) {
            toolbar = {
                items: items
            };
        }

        return toolbar;
    },

    setSearch: function (panel) {
        delete this.current;
        this.panel.removeAll();
        this.panel.add(panel);

        this.panel.updateLayout();
    },

    resetToolbarButtons: function () {
        if(this.toolbarbuttons.document) {
            this.toolbarbuttons.document.toggle(false);
        }
        if(this.toolbarbuttons.asset) {
            this.toolbarbuttons.asset.toggle(false);
        }
        if(this.toolbarbuttons.object) {
            this.toolbarbuttons.object.toggle(false);
        }
    },

    searchDocuments: function () {
        this.resetToolbarButtons();
        this.toolbarbuttons.document.toggle(true);

        this.current = new pimcore.bundle.search.element.selector.document(this);
    },

    searchAssets: function () {
        this.resetToolbarButtons();
        this.toolbarbuttons.asset.toggle(true);

        this.current = new pimcore.bundle.search.element.selector.asset(this);
    },

    searchObjects: function () {
        this.resetToolbarButtons();
        this.toolbarbuttons.object.toggle(true);

        this.current = new pimcore.bundle.search.element.selector.object(this);
    },

    commitData: function (data) {
        this.callback(data);
        if(this.window) {
            this.window.close();
        }
    }
});


/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.bundle.search.layout.toolbar');

/**
 * @private
 */
pimcore.bundle.search.layout.toolbar = Class.create({
    initialize: function (menu) {
        this.perspectiveCfg = pimcore.globalmanager.get('perspective');
        this.user = pimcore.globalmanager.get('user');
        this.searchRegistry = pimcore.globalmanager.get('searchImplementationRegistry');
        this.menu = menu;

        this.createSearchEntry();
    },

    createSearchEntry: function () {
        if (this.perspectiveCfg.inToolbar("search")) {
            const searchItems = [];

            if ((this.user.isAllowed("documents") ||
                this.user.isAllowed("assets") ||
                this.user.isAllowed("objects")) &&
                this.perspectiveCfg.inToolbar("search.quickSearch")) {
                searchItems.push({
                    text: t("quicksearch"),
                    iconCls: "pimcore_nav_icon_quicksearch",
                    itemId: 'pimcore_menu_search_quick_search',
                    handler: function () {
                        this.searchRegistry.showQuickSearch();
                    }.bind(this)
                });
                searchItems.push('-');
            }

            const searchAction = function (type) {
                pimcore.globalmanager.get('searchImplementationRegistry').openItemSelector(
                    false,
                    function (selection) {
                        pimcore.helpers.openElement(selection.id, selection.type, selection.subtype);
                    },
                    {type: [type]},
                    {
                        asTab: true,
                        context: {
                            scope: "globalSearch"
                        }
                    }
                );
            };

            if (this.user.isAllowed("documents") && this.perspectiveCfg.inToolbar("search.documents")) {
                searchItems.push({
                    text: t("documents"),
                    iconCls: "pimcore_nav_icon_document",
                    itemId: 'pimcore_menu_search_documents',
                    handler: searchAction.bind(this, "document")
                });
            }

            if (this.user.isAllowed("assets") && this.perspectiveCfg.inToolbar("search.assets")) {
                searchItems.push({
                    text: t("assets"),
                    iconCls: "pimcore_nav_icon_asset",
                    itemId: 'pimcore_menu_search_assets',
                    handler: searchAction.bind(this, "asset")
                });
            }

            if (this.user.isAllowed("objects") && this.perspectiveCfg.inToolbar("search.objects")) {
                searchItems.push({
                    text: t("data_objects"),
                    iconCls: "pimcore_nav_icon_object",
                    itemId: 'pimcore_menu_search_data_objects',
                    handler: searchAction.bind(this, "object")
                });
            }

            if (searchItems.length > 0) {
                this.menu.search = {
                    label: t('search'),
                    iconCls: 'pimcore_main_nav_icon_search',
                    items: searchItems,
                    shadow: false,
                    cls: "pimcore_navigation_flyout"
                };
            }
        }
    }
});


(()=>{"use strict";var e,r={},o={};function t(e){var n=o[e];if(void 0!==n)return n.exports;var i=o[e]={exports:{}};return r[e](i,i.exports,t),i.exports}t.m=r,e=[],t.O=(r,o,n,i)=>{if(!o){var l=1/0;for(p=0;p<e.length;p++){for(var[o,n,i]=e[p],a=!0,u=0;u<o.length;u++)(!1&i||l>=i)&&Object.keys(t.O).every((e=>t.O[e](o[u])))?o.splice(u--,1):(a=!1,i<l&&(l=i));if(a){e.splice(p--,1);var f=n();void 0!==f&&(r=f)}}return r}i=i||0;for(var p=e.length;p>0&&e[p-1][2]>i;p--)e[p]=e[p-1];e[p]=[o,n,i]},t.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return t.d(r,{a:r}),r},t.d=(e,r)=>{for(var o in r)t.o(r,o)&&!t.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:r[o]})},t.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),t.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.p="/bundles/pimcoretinymce/build/tinymce/",(()=>{var e={121:0};t.O.j=r=>0===e[r];var r=(r,o)=>{var n,i,[l,a,u]=o,f=0;if(l.some((r=>0!==e[r]))){for(n in a)t.o(a,n)&&(t.m[n]=a[n]);if(u)var p=u(t)}for(r&&r(o);f<l.length;f++)i=l[f],t.o(e,i)&&e[i]&&e[i][0](),e[i]=0;return t.O(p)},o=self.webpackChunk=self.webpackChunk||[];o.forEach(r.bind(null,0)),o.push=r.bind(null,o.push.bind(o))})()})();




"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[774],{596:(e,s,u)=>{u(5199),u(7726),u(7741),u(6075),u(378),u(1694),u(5081),u(2205),u(5791),u(7426),u(2073),u(5775),u(3847)}},e=>{e.O(0,[999],(()=>{return s=596,e(e.s=s);var s}));e.O()}]);


pimcore.registerNS("pimcore.bundle.tinymce.editor");
pimcore.bundle.tinymce.editor = Class.create({
    languageMapping: {
        fr: 'fr_FR',
        pt: 'pt_PT',
        sv: 'sv_SE',
        th: 'th_TH',
        hu: 'hu_HU'
    },

    maxChars: -1,

    initialize: function () {
        if(!parent.pimcore.wysiwyg) {
            parent.pimcore.wysiwyg = {};
            parent.pimcore.wysiwyg.editors = [];
        }
        parent.pimcore.wysiwyg.editors.push('TinyMCE');
        document.addEventListener(parent.pimcore.events.initializeWysiwyg, this.initializeWysiwyg.bind(this));
        document.addEventListener(parent.pimcore.events.createWysiwyg, this.createWysiwyg.bind(this));
        document.addEventListener(parent.pimcore.events.onDropWysiwyg, this.onDropWysiwyg.bind(this));
        document.addEventListener(parent.pimcore.events.beforeDestroyWysiwyg, this.beforeDestroyWysiwyg.bind(this));
    },

    initializeWysiwyg: function (e) {
        if (e.detail.context === 'object') {
            if (!isNaN(e.detail.config.maxCharacters) && e.detail.config.maxCharacters > 0) {
                this.maxChars = e.detail.config.maxCharacters;
            }else{
                this.maxChars = -1;
            }
        }

        this.config = e.detail.config;

        if(this.config.toolbarConfig) {
            const useNativeJson = Ext.USE_NATIVE_JSON;
            Ext.USE_NATIVE_JSON = false;
            const elementCustomConfig = Ext.decode(this.config.toolbarConfig);
            Ext.USE_NATIVE_JSON = useNativeJson;
            this.config = mergeObject(this.config, elementCustomConfig);
        }
    },

    createWysiwyg: function (e) {
        this.textareaId = e.detail.textarea.id ?? e.detail.textarea;

        const userLanguage = pimcore.globalmanager.get("user").language;
        let language = this.languageMapping[userLanguage];
        if (!language) {
            language = userLanguage;
        }
        if(language !== 'en') {
            language = {language: language};
        } else {
            language = {};
        }

        const toolbar1 = 'undo redo | blocks | ' +
            'bold italic | alignleft aligncenter ' +
            'alignright alignjustify | link';

        const toolbar2 = 'table | bullist numlist outdent indent | removeformat | code | help';
        let toolbar;
        if (e.detail.context === 'translation') {
            toolbar = {
                toolbar1: toolbar1,
                toolbar2: toolbar2
            };
        } else {
            toolbar = {
                toolbar1: `${toolbar1} | ${toolbar2}`
            };
        }

        let subSpace = '';
        if (e.detail.context === 'document') {
            subSpace = 'editables';
        } else if (e.detail.context === 'object') {
            subSpace = 'tags';
        }

        let defaultConfig = {};
        if('' !== subSpace && pimcore[e.detail.context][subSpace]) {
            defaultConfig = pimcore[e.detail.context][subSpace].wysiwyg ? pimcore[e.detail.context][subSpace].wysiwyg.defaultEditorConfig : {};
        }

        const maxChars = this.maxChars;

        tinymce.init(Object.assign({
            selector: `#${this.textareaId}`,
            height: 500,
            menubar: false,
            plugins: [
                'autolink', 'lists', 'link', 'image', 'code',
                'media', 'table', 'help', 'wordcount'
            ],
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            inline: true,
            base_url: '/bundles/pimcoretinymce/build/tinymce',
            suffix: '.min',
            convert_urls: false,
            convert_unsafe_embeds: true,
            extended_valid_elements: 'a[class|name|href|target|title|pimcore_id|pimcore_type],img[class|style|longdesc|usemap|src|border|alt=|title|hspace|vspace|width|height|align|pimcore_id|pimcore_type]',
            init_instance_callback: function (editor) {
                editor.on('input', function (eChange) {
                    tinymce.activeEditor.getBody().style.border = '';
                    tinymce.activeEditor.getElement().setAttribute('title', '');

                    const charCount = tinymce.activeEditor.plugins.wordcount.body.getCharacterCount();

                    if (maxChars !== -1 && charCount > maxChars) {
                        tinymce.activeEditor.getBody().style.border = '1px solid red';
                        tinymce.activeEditor.getElement().setAttribute('title', t('maximum_length_is') + ' ' + maxChars);
                    }
                    document.dispatchEvent(new CustomEvent(pimcore.events.changeWysiwyg, {
                        detail: {
                            e: eChange,
                            data: tinymce.activeEditor.getContent(),
                            context: e.detail.context
                        }
                    }));
                }.bind(this));
                editor.on('blur', function (eChange) {
                    document.dispatchEvent(new CustomEvent(pimcore.events.changeWysiwyg, {
                        detail: {
                            e: eChange,
                            data: tinymce.activeEditor.getContent(),
                            context: e.detail.context
                        }
                    }));
                }.bind(this));
            }.bind(this)

        }, language, toolbar, defaultConfig, this.config));

    },

    onDropWysiwyg: function (e) {
        let data = e.detail.data;

        let record = data.records[0];
        data = record.data;

        if (!tinymce.activeEditor) {
            return;
        }

        // we have to focus the editor otherwise an error is thrown in the case the editor wasn't opend before a drop element
        tinymce.activeEditor.focus();

        let wrappedText = data.text;
        let textIsSelected = false;

        let retval = tinymce.activeEditor.selection.getContent();
        if (retval.length > 0) {
            wrappedText = retval;
            textIsSelected = true;
        }

        // remove existing links out of the wrapped text
        wrappedText = wrappedText.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, function ($0, $1) {
            if ($1.toLowerCase() === "a") {
                return "";
            }
            return $0;
        });

        const id = data.id;
        let uri = data.path;
        const browserPossibleExtensions = ["jpg", "jpeg", "gif", "png"];

        if (data.elementType === "asset") {
            if (data.type === "image" && textIsSelected === false) {
                // images bigger than 600px or formats which cannot be displayed by the browser directly will be
                // converted by the pimcore thumbnailing service so that they can be displayed in the editor
                let defaultWidth = 600;
                let additionalAttributes = {};

                if (typeof data.imageWidth != "undefined") {
                    const route = 'pimcore_admin_asset_getimagethumbnail';
                    const params = {
                        id: id,
                        width: defaultWidth,
                        aspectratio: true
                    };

                    uri = Routing.generate(route, params);

                    if (data.imageWidth < defaultWidth
                        && in_arrayi(pimcore.helpers.getFileExtension(data.text),
                            browserPossibleExtensions)) {
                        uri = data.path;
                        additionalAttributes = mergeObject(additionalAttributes, {pimcore_disable_thumbnail: true});
                    }

                    if (data.imageWidth < defaultWidth) {
                        defaultWidth = data.imageWidth;
                    }

                    additionalAttributes = mergeObject(additionalAttributes, {style: `width:${defaultWidth}px;`});
                }

                additionalAttributes = mergeObject(additionalAttributes, {
                    src: uri,
                    target: '_blank',
                    alt: 'asset_image',
                    pimcore_id: id,
                    pimcore_type: 'asset'
                });
                tinymce.activeEditor.selection.setContent(tinymce.activeEditor.dom.createHTML('img', additionalAttributes));
                return true;
            } else {
                tinymce.activeEditor.selection.setContent(tinymce.activeEditor.dom.createHTML('a', {
                    href: uri,
                    target: '_blank',
                    pimcore_id: id,
                    pimcore_type: 'asset'
                }, wrappedText));
                return true;
            }
        }

        if (data.elementType === "document" && (data.type === "page"
            || data.type === "hardlink" || data.type === "link")) {
            tinymce.activeEditor.selection.setContent(tinymce.activeEditor.dom.createHTML('a', {
                href: uri,
                pimcore_id: id,
                pimcore_type: 'document'
            }, wrappedText));
            return true;
        }

        if (data.elementType === "object") {
            tinymce.activeEditor.selection.setContent(tinymce.activeEditor.dom.createHTML('a', {
                href: uri,
                pimcore_id: id,
                pimcore_type: 'object'
            }, wrappedText));
            return true;
        }
    },

    beforeDestroyWysiwyg: function (e) {
        tinymce.remove(`#${this.textareaId}`);
    }
})

new pimcore.bundle.tinymce.editor();


