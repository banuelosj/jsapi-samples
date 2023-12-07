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
  "esri/widgets/UtilityNetworkTrace",
  "esri/widgets/UtilityNetworkValidateTopology",
  "esri/widgets/UtilityNetworkAssociations",
  "esri/layers/FeatureLayer"

], function(
  WebMap,
  MapView,
  Editor,
  LayerList,
  Legend,
  reactiveUtils,
  VersionManagementService,
  FeatureService,
  esriConfig,
  UtilityNetworkTrace,
  UtilityNetworkValidateTopology,
  UtilityNetworkAssociations,
  FeatureLayer

) {

  /***
   * TODO:
   * 1. Set access buttons based of version access 
   * 2. Add event listener for version access buttons on version creation
   * 3. Alter a version - X
   * 4. Reconcile
   * 5. Post
   * 6. Editing Session (start/stop reading/editing save/discard edits)
   * 7. Undo / Redo
   * 8. View Associations Widget
   * 9. Validate Network Topology Widget
   * 10. Utility Network Trace widget
   * 11. Sorting version list view
   */
  let utilityNetwork, rulesTable, dirtyArea;
  let activeWidget;
  let portalOrg, webMapId;
  let editor, tracer, validateTopolgy, showAssociations;
  let view;
  let fs, vms;
  let webmap;
  let currentVersionIdentifier = null;
  let currentListItemNode;
  let originalList = null;
  let originalVersionList = null;
    let versionIdentifierToAlter = null;

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
    addTraceWidget();
    view.ui.add(editor, "top-right");
    editor.visible = false;
    
    const layerList = new LayerList({ view, container: "layers-container" });
    const legend = new Legend({ view, container: "legend-container" });
   
    view.when(async () => {
      await view.map.loadAll();
      await webmap.utilityNetworks.getItemAt(0).load();
      utilityNetwork = webmap.utilityNetworks.getItemAt(0);
      const dirtyArea = new FeatureLayer({
        // URL to the dirty area
        url: webmap.utilityNetworks.getItemAt(0).networkSystemLayers.dirtyAreasLayerUrl
      });
      await dirtyArea.load();
      console.log(dirtyArea);
      addAssociationsWidget();
      addValidateNetworkTopologyWidget();
      await webmap.add(dirtyArea);
      // DELETE: temp interceptor for testing
      esriConfig.request.interceptors.push(
        {
          urls: view.map.editableLayers.items[0].url,
          after: async (response) => {
            if(response.data.currentVersion && response.data.currentVersion < 11.2) {
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
        console.log(utilityNetwork);
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
  let  buttonsThatNeedToBeReenabled = [];

  const list = document.getElementById("listEl");
  const versionList = document.getElementById("versionListEl");
  versionList.addEventListener("calciteListChange", handleVersionChange)
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
  const deleteNotice = document.getElementById("delete-notice");
  const deleteNoticeCancelBtn = document.getElementById("delete-notice-cancel-btn");
  deleteNoticeCancelBtn.addEventListener("click", cancelDeleteNotice);
  const deleteNoticeDeleteBtn = document.getElementById("delete-notice-delete-btn");
  deleteNoticeDeleteBtn.addEventListener("click", deleteVersion);
  // create version
  const createVersionFlowBackBtn = document.getElementById("create-version-flow-back-btn");
  createVersionFlowBackBtn.addEventListener("click", goBack);
  const createVersionFlowBtn = document.getElementById("create-version-flow-btn");
  createVersionFlowBtn.addEventListener("click", createVersion);
  const versionInputName = document.getElementById("version-name-input");
  const versionInputDescription = document.getElementById("version-description-input");
  // alter version
  const alterVersionFlowItem = document.getElementById("version-alter-flow-item");
  alterVersionFlowItem.addEventListener("calciteFlowItemBack", resetAlterInputs);
  const versionAlterInputName = document.getElementById("alter-version-name-input");
  versionAlterInputName.addEventListener("calciteInputInput", handleAlterInputNameChange);
  const versionAlterInputDescription = document.getElementById("alter-version-description-input");
  versionAlterInputDescription.addEventListener("calciteInputInput", handleAlterInputDescriptionChange);
  const alterUpdateBtn = document.getElementById("alter-version-flow-btn");
  alterUpdateBtn.addEventListener("click", alterVersion);

  // session management
  const startEditingBtn = document.getElementById("start-editing-flow-btn");
  startEditingBtn.addEventListener("click", startEditSession);
  const stopEditingBtn = document.getElementById("stop-editing-flow-btn");
  stopEditingBtn.addEventListener("click", stopEditSession);

  // save revert
  const saveRevertNotice =  document.getElementById("save-revert-notice");
  const revertBtn = document.getElementById("revert-notice-btn");
  revertBtn.addEventListener("click", stopEditingRevertEdits);
  const saveBtn = document.getElementById("save-notice-btn");
  saveBtn.addEventListener("click", stopEditingSaveEdits);
  
  // undo redo
  const undoBtn =  document.getElementById("undo");
  const redoBtn = document.getElementById("redo");
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  // reconcile post
  const reconcileNotice =  document.getElementById("by-Atrribute-by-object-notice");
  const reconcileBtn =  document.getElementById("reconcile");
  const reconcileByAttributeBtn =  document.getElementById("by-attribute");
  const reconcileByObjectBtn =  document.getElementById("by-object");
  const postBtn = document.getElementById("post");
  reconcileBtn.addEventListener("click", () => reconcileNotice.open = true);
  postBtn.addEventListener("click", post);
  reconcileByAttributeBtn.addEventListener("click", reconcileByAttribute);
  reconcileByObjectBtn.addEventListener("click", reconcileByObject);

  //Widgets
  const traceWidgetBtn =  document.getElementById("trace-widget");
  const editorWidgetBtn =  document.getElementById("editor-widget");
  const validateTopologyBtn =  document.getElementById("validate-widget");
  const showAssociationsBtn =  document.getElementById("associations-widget");

  traceWidgetBtn.addEventListener("click", () => showWidget(0));
  editorWidgetBtn.addEventListener("click", () => showWidget(1));
  validateTopologyBtn.addEventListener("click",() =>  showWidget(2));
  showAssociationsBtn .addEventListener("click", () => showWidget(3));

  //Warning while in session
   // save revert
   const changeVersionNotice =  document.getElementById("change-version-notice");
   const okayBtn = document.getElementById("okay");
   okayBtn.addEventListener("click", () => changeVersionNotice.open = false);

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
        // cannot alter sde.DEFAULT so do not add pencil alter button
        const alterBtn = document.createElement("calcite-action");
        alterBtn.slot = "actions-end";
        alterBtn.icon = "pencil";
        alterBtn.addEventListener("click", handleVersionAlterBtn);
        listItem.appendChild(alterBtn);
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
        addTraceWidget();
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
    editor.visible = false;
    editor.snappingOptions.enabled = true;
    editor.snappingOptions.featureEnabled = true;
    enableSnappingOnLayers(editableLayers);
  }

  function addTraceWidget(){
    tracer = new UtilityNetworkTrace({
      view: view
    });
    
    view.ui.add(tracer, "top-right");
    tracer.visible = false;
  }

  function addValidateNetworkTopologyWidget(){
    validateTopolgy = new UtilityNetworkValidateTopology({
      view: view,
      utilityNetwork: utilityNetwork
    });
    
    view.ui.add(validateTopolgy, "top-right");
    validateTopolgy.visible = false;
  }


  function addAssociationsWidget(){
    showAssociations = new UtilityNetworkAssociations({
      view: view,
      utilityNetwork: utilityNetwork
    });
    
    view.ui.add(showAssociations, "top-right");
    showAssociations.visible = false;
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

  // alter version
  function displayAlterVersionFlow(access, description, name) {
    setFlowInputValues(access, description, name);
    flow.append(alterVersionFlowItem);
    alterVersionFlowItem.closed = false;
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

  function resetAlterInputs() {
    versionAlterInputName.value = "";
    versionAlterInputDescription.value = "";
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
    vms.deleteVersion(versionIdentifierToDelete);
    versionList.removeChild(currentListItemNode);
    versionList.disabled = false;
    deleteNotice.open = false;
  }

  async function handleVersionAlterBtn(evt) {
    versionIdentifierToAlter = await vms.getVersionIdentifierFromGuid(evt.target.parentNode.description);
    const { access, description, versionIdentifier } = await vms.getVersionInfoExtended(versionIdentifierToAlter);
    displayAlterVersionFlow(access, description, versionIdentifier.name);
  }

  function setFlowInputValues(access, description, name) {
    const indexOfFirst = name.indexOf('.');
    name = name.slice(indexOfFirst + 1);
    
    versionAlterInputName.value = name;
    versionAlterInputDescription.value = description;
  }
  
  function handleAlterInputNameChange(evt) {
    alterUpdateBtn.disabled = false;
  }
  
  function handleAlterInputDescriptionChange(evt) {
    alterUpdateBtn.disabled = false;
  }

  function alterVersion() {
    vms.alterVersion(versionIdentifierToAlter, {
      versionName: versionAlterInputName.value,
      description: versionAlterInputDescription.value
    }).then(async (response) => {
      console.log("successfully altered version");
      let versionInfos = await vms.getVersionInfos();
      displayVersionsInPanel(versionInfos)
      goBack();
      alterUpdateBtn.disabled = true;
    }).catch((err) => {
      console.log("failed to alter version: ", err);
    });
  }
    async function startReading() {
    await vms.startReading(currentVersionIdentifier).then(async (response) => {
      console.log("successfully started reading version");
    }).catch((err) => {
      console.log("failed to start reading: ", err);
    });
  }
  async function stopReading() {
    await vms.stopReading(currentVersionIdentifier).then(async (response) => {
      console.log("successfully stopped reading version");
    }).catch((err) => {
      console.log("failed to stop reading: ", err);
    });
  }
  async function startEditing() {
    await vms.startEditing(currentVersionIdentifier).then(async (response) => {
      console.log("successfully started editing version");
    }).catch((err) => {
      console.log("failed to start editing: ", err);
    });
  }
  async function stopEditingSaveEdits() {
    document.body.style.cursor='wait';
    await blockButtonInput()
    await vms.stopEditing(currentVersionIdentifier, true).then(async (response) => {
      console.log("successfully stopped editing version");
      saveRevertNotice.open = false;
      await stopReading();
      await returnButtonsToPreviousState()
      startEditingBtn.disabled = false;
      stopEditingBtn.disabled = true;
      versionActionBtn.disabled = false;
    }).catch((err) => {
      console.log("failed to stop editing: ", err);
    });
  }
  async function stopEditingRevertEdits() {
    document.body.style.cursor='wait';
    await blockButtonInput()
    await vms.stopEditing(currentVersionIdentifier,false).then(async (response) => {
      console.log("successfully stopped editing version");
      saveRevertNotice.open = false;
      await stopReading();
      await returnButtonsToPreviousState()
      startEditingBtn.disabled = false;
      stopEditingBtn.disabled = true;
      versionActionBtn.disabled = false;
      
      clearInterval(undoInterval);
      clearInterval(redoInterval);
      undoBtn.disabled = true;
      redoBtn.disabled = true;
    }).catch((err) => {
      console.log("failed to stop editing: ", err);
    });
  }
  async function startEditSession(){
    document.body.style.cursor='wait';
    await blockButtonInput()
    await startReading();
    await startEditing();
    await returnButtonsToPreviousState()
    startEditingBtn.disabled = true;
    stopEditingBtn.disabled = false;
    versionActionBtn.disabled = true;
    changeVersionNotice.open = true;
    undoInterval = setInterval(() => vms.canUndo(currentVersionIdentifier) === true ? undoBtn.disabled = false : undoBtn.disabled = true, 1000);
    redoInterval = setInterval(() => vms.canRedo(currentVersionIdentifier) === true ? redoBtn.disabled = false : redoBtn.disabled = true, 1000);
    
  }
  async function stopEditSession(){
    saveRevertNotice.open = true;
  }
  async function undo() {
    await vms.undo(currentVersionIdentifier)
  }
  async function redo() {
    await vms.redo(currentVersionIdentifier)
  }
  async function reconcileByAttribute() {
    await vms.reconcile(currentVersionIdentifier, {conflictDetection: "by-attribute"}).then(async (response) => {
      console.log("successfully reconciled version");
      reconcileNotice.open = false;
      await blockButtonInput()
      await returnButtonsToPreviousState()
      postBtn.disabled = false;
      reconcileBtn.disabled = true;
    }).catch((err) => {
      console.log("failed to reconcile version: ", err);
    });
  }
  async function reconcileByObject() {
    await vms.reconcile(currentVersionIdentifier, {conflictDetection: "by-object"}).then(async (response) => {
      console.log("successfully reconciled version");
      reconcileNotice.open = false;
      await blockButtonInput()
      await returnButtonsToPreviousState()
      postBtn.disabled = false;
      reconcileBtn.disabled = true;
    }).catch((err) => {
      console.log("failed to reconcile version: ", err);
    });
  }
  async function post() {
    await vms.post(currentVersionIdentifier).then(async (response) => {
      console.log("post operation wass successful");
      await blockButtonInput()
      await returnButtonsToPreviousState()
      postBtn.disabled = true;
      reconcileBtn.disabled = false;
    }).catch((err) => {
      console.log("failed to post version changes: ", err);
    });
  }
  async function blockButtonInput(){
   const buttons = document.querySelectorAll('calcite-button');
   const calciteAction = document.querySelectorAll('calcite-action');
   for (let i = 0; i < calciteAction.length; i++) 
      calciteAction[i].disabled = true;
 
   // Disable all buttons
   for (let i = 0; i < buttons.length; i++) {
   if(!buttons[i].disabled){
     buttonsThatNeedToBeReenabled.push(i);
     buttons[i].disabled = true;
   }
}
  }
  async function returnButtonsToPreviousState(){
    const buttons = document.querySelectorAll('calcite-button');
    const calciteAction = document.querySelectorAll('calcite-action');
    for (let i = 0; i < buttonsThatNeedToBeReenabled.length; i++) 
        buttons[buttonsThatNeedToBeReenabled[i]].disabled = false;
    for (let i = 0; i < calciteAction.length; i++) 
          calciteAction[i].disabled = false;
    document.body.style.cursor='default';
    buttonsThatNeedToBeReenabled = [];
  }

  function showWidget(widgetNumber){
    switch(widgetNumber){
      case 0:
        tracer.visible = true;
        editor.visible = false;
        validateTopolgy.visible = false;
        showAssociations.visible = false;
        break;
      case 1:
        tracer.visible = false;
        editor.visible = true;
        validateTopolgy.visible = false;
        showAssociations.visible = false;
        break;
      case 2:
        tracer.visible = false;
        editor.visible = false;
        validateTopolgy.visible = true;
        showAssociations.visible = false;
        break;
      case 3:
        tracer.visible = false;
        editor.visible = false;
        validateTopolgy.visible = false;
        showAssociations.visible = true;
        break;
      default:
        console.log("no case");
    }
  }

});