require([
  "esri/WebMap", 
  "esri/views/MapView", 
  "esri/widgets/Editor",
  "esri/widgets/LayerList",
  "esri/widgets/Legend",
  "esri/core/reactiveUtils",
  "esri/versionManagement/VersionManagementService",
  "esri/rest/featureService/FeatureService",
  "esri/config",
], function(
  WebMap,
  MapView,
  Editor,
  LayerList,
  Legend,
  reactiveUtils,
  VersionManagementService,
  FeatureService,
  esriConfig
) {

  let utilityNetwork, rulesTable;
  let activeWidget;
  let portalOrg, webMapId;
  let editor;
  let view;
  let fs, vms;
  let webmap;
  let currentVersionIdentifier = null;
  let currentListItemNode;

  document.querySelector(`[data-action-id=layers]`).active = true;
  document.querySelector(`[data-panel-id=layers]`).hidden = false;

  const modalSaveBtn = document.getElementById("modal-save-btn");
  modalSaveBtn.onclick = () => { submitModal() };

  function submitModal() {
    portalOrg = document.getElementById("modal-org-input").value;
    webMapId = document.getElementById("modal-webmap-input").value;

    let orgId = !portalOrg ? "https://arcgis.com" : portalOrg;
    webmap = new WebMap({
      portalItem: {
        portal: {
          url: orgId
        },
        id: webMapId
      }
    });
    loadInitialMap(webmap);
    document.getElementById("webmap-modal").open = false;
  }

  function loadInitialMap(webmap) {
    view = new MapView({
      container: "viewDiv",
      map: webmap
    });

    editor = new Editor({
      view: view
    });
    view.ui.add(editor, "top-right");

    const layerList = new LayerList({ view, container: "layers-container" });
    const legend = new Legend({ view, container: "legend-container" });

    view.when(async () => {
      await view.map.loadAll();
      // DELETE: temp interceptor for testing
      esriConfig.request.interceptors.push(
        {
          urls: view.map.editableLayers.items[0].url,
          after: async (response) => {
            if(response.data.currentVersion && response.data.currentVersion === 11.1) {
              response.data.currentVersion = "11.2";
            }

          }
        }
      );

      editor.snappingOptions.enabled = true;
      editor.snappingOptions.featureEnabled = true;
      enableSnappingOnLayers(view.map.editableLayers.items);
 
      // grabbing the first layer
      // not ideal, might need to update this later
      loadFSAndVMS(view.map.editableLayers.items[0]);

      // Check if webmap contains utility networks.
      if (webmap?.utilityNetworks?.length > 0) {
        //setVersion(view.map.layers.items, MY_VERSION);

        // Assigns the utility network at index 0 to utilityNetwork. 
        utilityNetwork = webmap.utilityNetworks.getItemAt(0);

        // Triggers the loading of the UtilityNetwork instance.
        await utilityNetwork.load();

        // load the rules table
        rulesTable = await utilityNetwork.getRulesTable();
        await rulesTable.load();
        displayRulesInPanel(rulesTable);
      }

      setPortalOrgWebMapId(view.map);
    });
  }
  

  // UI
  // Add the widget to the view
  
  document.querySelector("calcite-action-bar").addEventListener("click", handleActionBarClick);
  document.querySelector("calcite-shell").hidden = false;
  const list = document.getElementById("listEl");
  const versionList = document.getElementById("versionListEl");
  versionList.addEventListener("calciteListChange", handleVersionChange)
  let originalList = null;
  let originalVersionList = null;
  const filterInput = document.getElementById("filterInput");
  filterInput.addEventListener("calciteInputTextInput", handleInputFilter);
  const versionsFilterInput = document.getElementById("versionsFilterInput");
  versionsFilterInput.addEventListener("calciteInputTextInput", handleInputVersionsFilter);
  const orgNameInput = document.getElementById("orgNameInput");
  const webmapIdInput = document.getElementById("webmapIdInput");
  const updateBtn = document.getElementById("updateBtn");
  updateBtn.onclick = () => { updateWebMap() };
  const versionActionBtn = document.getElementById("version-action-btn");
  const createVersionFabBtn = document.getElementById("create-version-fab-btn");
  createVersionFabBtn.addEventListener("click", displayCreateVersionFlow);
  const versionFlow = document.getElementById("version-create-flow-item");
  versionFlow.addEventListener("calciteFlowItemBack", resetInputs);
  const createVersionFlowBackBtn = document.getElementById("create-version-flow-back-btn");
  createVersionFlowBackBtn.addEventListener("click", goBack);
  const createVersionFlowBtn = document.getElementById("create-version-flow-btn");
  createVersionFlowBtn.addEventListener("click", createVersion);
  const versionInputName = document.getElementById("version-name-input");
  const versionInputDescription = document.getElementById("version-description-input");
  const deleteNotice = document.getElementById("delete-notice");
  const deleteNoticeCancelBtn = document.getElementById("delete-notice-cancel-btn");
  deleteNoticeCancelBtn.addEventListener("click", cancelDeleteNotice);
  const deleteNoticeDeleteBtn = document.getElementById("delete-notice-delete-btn");
  deleteNoticeDeleteBtn.addEventListener("click", deleteVersion);

  // input event listening
  orgNameInput.addEventListener('calciteInputInput', (evt) => {
    updateBtn.disabled = false;
  });

  webmapIdInput.addEventListener('calciteInputInput', (evt) => {
    updateBtn.disabled = false;
  });

  function handleActionBarClick({ target }) {
    if (target.tagName !== "CALCITE-ACTION") {
      return;
    }

    document.querySelector(`[data-action-id=layers]`).active = false;
    document.querySelector(`[data-panel-id=layers]`).hidden = true;

    const nextWidget = target.dataset.actionId;

    if (activeWidget) {
      document.querySelector(`[data-action-id=${activeWidget}]`).active = false;
      document.querySelector(`[data-panel-id=${activeWidget}]`).hidden = true;
    }
    
    if (nextWidget !== activeWidget) {
      document.querySelector(`[data-action-id=${nextWidget}]`).active = true;
      document.querySelector(`[data-panel-id=${nextWidget}]`).hidden = false;
      
      activeWidget = nextWidget;
    } else {
      activeWidget = null;
    }
  }

  function displayRulesInPanel({ rules }) {
    list.innerHTML = "";
    rules.forEach((item) => {
      const { ruleType, fromAssetGroup, fromAssetType, toAssetGroup, toAssetType } = item;
      const listItem = document.createElement("calcite-list-item");
      listItem.label = getRuleNameFromCode(ruleType);
      const descriptionString = `${fromAssetGroup.assetGroupName} | ${fromAssetType.assetTypeName} (${fromAssetType.connectivityPolicy}) | ${toAssetGroup.assetGroupName} | ${toAssetType.assetTypeName}`;
      listItem.description = descriptionString;
      list.append(listItem);
    });
    originalList = [...list.children];
  }

  function displayVersionsInPanel(versions) {
    versionActionBtn.indicator = true;
    versionList.innerHTML = "";
    versions.forEach((item) => {
      const { access, description, versionIdentifier } = item;
      const listItem = document.createElement("calcite-list-item");
      listItem.label = `(${access}) ${versionIdentifier.name}`;
      listItem.description = versionIdentifier.guid;
      listItem.value = versionIdentifier.name;
      // select default version
      if (vms.defaultVersionIdentifier.name === versionIdentifier.name) {
        listItem.selected = true;
        currentVersion = vms.defaultVersionIdentifier;
      } else {
        // cannot delete sde.DEFAULT so do not add trash delete button
        const deleteBtn = document.createElement("calcite-action");
        deleteBtn.slot = "actions-end";
        deleteBtn.icon = "trash";
        deleteBtn.addEventListener("click", handleVersionDeleteBtn);
        listItem.appendChild(deleteBtn);
      }
      versionList.append(listItem);
    }); 
    originalVersionList = [...versionList.children];
  }

  function getRuleNameFromCode(code) {
    switch (code) {
      case 1:
        return "Junction-Junction Connectivity";
        break;
      case 2:
        return "Containment";
        break;
      case 3:
        return "Structural Attachment";
        break;
      case 4:
        return "Junction-Edge Connectivity";
        break;
      case 5:
        return "Edge-Junction-Edge Connectivity";
        break;
      default:
        return "Unknown";
    }
  }

  function handleInputFilter(evt) {
    let { value } = evt.target;
    value = value.toLowerCase();
    
    let filteredResults = [...originalList];
    filteredResults = filteredResults.filter((item) => item.description.toLowerCase().includes(value));
    list.replaceChildren(...filteredResults) ;
  }

  function handleInputVersionsFilter(evt) {
    let { value } = evt.target;
    value = value.toLowerCase();
    
    let filteredResults = [...originalVersionList];
    filteredResults = filteredResults.filter((item) => item.label.toLowerCase().includes(value));
    versionList.replaceChildren(...filteredResults) ;
  }

  function setPortalOrgWebMapId(map) {
    const { portalItem } = map;
    orgNameInput.value = portalItem.portal.url;
    webmapIdInput.value = portalItem.id;
  }

  async function updateWebMap() {
    portalOrg = orgNameInput.value;
    webMapId = webmapIdInput.value;

    view.ui.remove(editor);
    editor.destroy();
    view.map.destroy();

    let orgId = !portalOrg ? "https://arcgis.com" : portalOrg;

    webmap = new WebMap({
      portalItem: {
        id: webMapId,
        portal: {
          url: orgId
        }
      }
    });

    await webmap.load();
    view.map = webmap;

    reactiveUtils.watch(
      () => !view.updating,
      () => {
        view.goTo(view.map.initialViewProperties.viewpoint.targetGeometry)
        addEditor(view.map.editableLayers.items);
        loadFSAndVMS(view.map.editableLayers.items[0]);
      }, { once: true }
    );

    updateBtn.disabled = true;

    // Check if webmap contains utility networks.
    if (webmap.utilityNetworks?.length > 0) {
      //setVersion(view.map.layers.items, MY_VERSION);

      // Assigns the utility network at index 0 to utilityNetwork. 
      utilityNetwork = webmap.utilityNetworks.getItemAt(0);

      // Triggers the loading of the UtilityNetwork instance.
      await utilityNetwork.load();

      // load the rules table
      rulesTable = await utilityNetwork.getRulesTable();
      await rulesTable.load();
      displayRulesInPanel(rulesTable);
    }
  }

  function addEditor(editableLayers) {
    editor = new Editor({
      view: view,
    });
    view.ui.add(editor, "top-right");

    editor.snappingOptions.enabled = true;
    editor.snappingOptions.featureEnabled = true;
    enableSnappingOnLayers(editableLayers);
  }

  async function loadFSAndVMS(layer) {
    const { url } = layer;
    if(!!url) { 
      fs = new FeatureService({ url: url });
      await fs.load();

      if(fs.versionManagementServiceUrl) {
        vms = new VersionManagementService({ url: fs.versionManagementServiceUrl });
        await vms.load();

        currentVersionIdentifier = vms.defaultVersionIdentifier;
        let versionInfos = await vms.getVersionInfos();
        displayVersionsInPanel(versionInfos)
      }
    }
  }

  async function handleVersionChange(evt) {
    const { selectedItems } = evt.target;
    const newVersionIdentifier = await vms.getVersionIdentifierFromName(selectedItems[0].value);
    changeVersion(webmap, newVersionIdentifier, currentVersionIdentifier);
  }

  async function changeVersion(map, newVersion, currentVersion) {
    await vms.changeVersion(map, currentVersion, newVersion);
    currentVersionIdentifier = newVersion;
  }

  function enableSnappingOnLayers(layers) {
    layers.forEach((layer) => {
      editor.snappingOptions.featureSources.push({ layer, enabled: true });
    });
  }

  // version creation
  function displayCreateVersionFlow() {
    flow.append(versionFlow);
    versionFlow.closed = false;
  }
  
  function goBack() {
    document.getElementById("flow").back();
    resetInputs();
  }
  
  // defaulting to public access
  // TODO: Get the access UI working 
  function createVersion(evt) {
    console.log("versionInputName: ", versionInputName.value);
    console.log("versionInputDescriptioN: ", versionInputDescription.value);
    vms.createVersion({
      versionName: versionInputName.value,
      description: versionInputDescription.value,
      access: "public"
    }).then(async () => {
      let versionInfos = await vms.getVersionInfos();
      displayVersionsInPanel(versionInfos)
      goBack();
    }).catch((err) => {
      console.log("failed to create version with: ", err);
    });
  }
  
  function resetInputs() {
    versionInputName.value = "";
    versionInputDescription.value = "";
  }
  
  async function handleVersionDeleteBtn(evt) {
    deleteNotice.open = true;
    versionList.disabled = true;
    currentListItemNode = evt.target.parentNode;
  }
  
  function cancelDeleteNotice() {
    versionList.disabled = false;
    deleteNotice.open = false;
  }
  
  async function deleteVersion() {
    const versionIdentifierToDelete = await vms.getVersionIdentifierFromName(currentListItemNode.value);
    // delete version
    // Note: We shouldn't allow people to delete the current version that they are on.
    // For now we switch the user to sde.DEFAULT if the current version matches the version they are trying
    // to delete.
    // TODO: Prevent users from deleting current version, but not switching to sde.Default
    if(versionIdentifierToDelete.name === currentVersionIdentifier.name) {
      // trying to delete current version, so switch the version to sde.DEFAULT first
      // before deleting
      currentVersionIdentifier = vms.defaultVersionIdentifier;
      versionList.children[0].selected = true;
    }
    // prompt to confirm if they want to delete this version
    //vms.deleteVersion(versionIdentifierToDelete);
    versionList.removeChild(currentListItemNode);
    versionList.disabled = false;
    deleteNotice.open = false;
  }
  
});