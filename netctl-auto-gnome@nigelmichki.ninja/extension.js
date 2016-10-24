/*
 * Netctl Menu is a Gnome 3 extension that allows you to  switch between netctl
 * profiles using a menu in the notification area.
 *
 * Copyright (C) 2016 Nigel S. Michki 
 * Previous contributors :
 * - Tjaart van der Walt (original creator)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


//Imports/definitions

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const St = imports.gi.St;
const Shell = imports.gi.Shell;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

//Items of interest


//Names of icons for the activities bar
const NETWORK_CONNECTED = 'network-wireless-signal-excellent-symbolic';
//const NETWORK_CONNECTED = 'network-wireless';
const NETWORK_OFFLINE = 'network-wireless-offline-symbolic';
//const NETWORK_OFFLINE = 'network-offline';

const REFRESH_TIME = 3     //seconds

// Submenu
const netctlStatusSubMenu = new Lang.Class({
	Name: 'netctlStatusSubMenu',
	Extends: PopupMenu.PopupSubMenuMenuItem,

	_init: function(profile, isAVpn) {
      this.parent(profile, true);

      // Boilerplate code to make the menu.
      // If we're a VPN.
      this.icon = new St.Icon({icon_name: 'network-vpn-symbolic', 
         style_class: 'system-status-icon'});
      let box = new St.BoxLayout({vertical: false, 
         style_class: 'panel-status-menu-box'});
      this.label = new St.Label({text: '', y_expand: true, 
         y_align: Clutter.ActorAlign.CENTER});
      box.add_child(this.label);
      this.actor.add_actor(box);

      // Now, if we're open, we add in items!  Or whatever.  We want to do things when
      // we activate.
      this.menu.connect('open-state-changed', Lang.bind(this, function(menu, isOpen) {
             // On activate, we want to add things to it!
          if (isOpen)
            //this._addItems()
            this._defaultMenuItems(profile, isAVpn);
         }));
	  let item = new PopupMenu.PopupMenuItem('Connecting...');
	  this.menu.addMenuItem(item);
      box.add_child(this.icon);
	},

    _defaultMenuItems: function(profile, isAVpn) {
      // First, we remove the 'default' menu items.
	  this.menu.removeAll();

      // Now we start populating it with stuff we care about.
      // Actually, we want this as a menu...
      let menuItem = null;
      let statusMenuItem = null;
      let offMenuItem = null;
      let currentStatus = null;
      if (isAVpn)
          var currentStatus = this._return_vpn_status(profile);
      else
          var currentStatus = this._return_netctl_auto_status(profile);
      if(currentStatus.match('inactive') || currentStatus.match('failed')){
	      var statusMenuItem = new PopupMenu.PopupSeparatorMenuItem('Status: Off');
          var menuItem = new PopupMenu.PopupMenuItem('Connect');
          if (isAVpn){
              this.icon = new St.Icon({icon_name: 'network-vpn-acquiring', 
                 style_class: 'system-status-icon'});
          }
          else{
              this.icon = new St.Icon({icon_name: 'network-wireless-acquiring-symbolic', 
                 style_class: 'system-status-icon'});
          }

          this.menu.addMenuItem(statusMenuItem);
          this.menu.addMenuItem(menuItem);
      }
      else{
	      var statusMenuItem = new PopupMenu.PopupSeparatorMenuItem('Status: On');
          var menuItem = new PopupMenu.PopupMenuItem('Reset');
          var offMenuItem = new PopupMenu.PopupMenuItem('Disconnect');
          if (isAVpn){
              this.icon = new St.Icon({icon_name: 'network-vpn-symbolic', 
                 style_class: 'system-status-icon'});
          }
          else{
              this.icon = new St.Icon({icon_name: 'network-wireless-symbolic', 
                 style_class: 'system-status-icon'});
          }
          this.menu.addMenuItem(statusMenuItem);
          this.menu.addMenuItem(menuItem);
          this.menu.addMenuItem(offMenuItem);
          offMenuItem.connect('activate', Lang.bind(this, function() {
            if (isAVpn)
                this._disable_vpn_profile(profile);
            else
                this._disable_netctl_auto_profile(profile);
          }));
          if (isAVpn)
              var currentStatus = new PopupMenu.PopupMenuItem(this._return_vpn_status(profile));
          else
              var currentStatus = new PopupMenu.PopupMenuItem(this._return_netctl_auto_status(profile));
          this.menu.addMenuItem(currentStatus);
      }

      menuItem.connect('activate', Lang.bind(this, function() {
        if (isAVpn)
            this._switch_to_vpn_profile(profile);
        else
            this._switch_to_netctl_auto_profile(profile);
      }));

    },

    _addItems: function (menuItem) {
      this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_(menuItem)));
    },

    _addMenuItems: function (menuItem) {
      var newSubMenu = new subMenuItem(menuItem);
      this.menu.addMenuItem(newSubMenu);
    },

   _switch_to_vpn_profile: function(profileName) {
      this._execute_async("sudo /usr/bin/netctl restart " + profileName.replace('*', ''));
   },

   _disable_vpn_profile: function(profileName) {
      this._execute_async("sudo /usr/bin/netctl stop " + profileName.replace('*', ''));
   },

   _return_vpn_status: function(profileName) {
     // Remove the asterisk character.  This pops up in active profiles.
     var profileStatus = GLib.spawn_command_line_sync("netctl status " + profileName.replace('*',''))[1].toString();
     return profileStatus
   },

   _switch_to_netctl_auto_profile: function(profileName) {
      //this._execute_async("sudo /usr/bin/netctl-auto restart " + profileName.replace('*', ''));
      this._execute_async("sudo /usr/bin/systemctl restart netctl-auto@wlp3s0");
   },

   _disable_netctl_auto_profile: function(profileName) {
      //this._execute_async("sudo /usr/bin/netctl-auto stop " + profileName.replace('*', ''));
      this._execute_async("sudo /usr/bin/systemctl stop netctl-auto@wlp3s0");
   },

   _return_netctl_auto_status: function(profileName) {
     // Remove the asterisk character.  This pops up in active profiles.
       // Okay, so we're just bullshitting it for now.
     var profileStatus = GLib.spawn_command_line_sync("systemctl status netctl-auto@wlp3s0")[1].toString();
     return profileStatus
   },

   _execute_async: function(command) {
      try {
         let [result, argv] = GLib.shell_parse_argv(command);
         GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
      }
      catch (e) {
         global.logError(e);
      }
   },
});

//The extension core
const NetctlSwitcher = new Lang.Class({
   Name: 'NetctlSwitcher',
   Extends: PanelMenu.Button,
//	Extends: PopupMenu.PopupSubMenuMenuItem,

   _init: function(){
      this.parent(0.0, 'NetctlSwitcher');

      this.icon = new St.Icon({icon_name: 'network-wireless-acquiring-symbolic', 
         style_class: 'system-status-icon'});
      let box = new St.BoxLayout({vertical: false, 
         style_class: 'panel-status-menu-box'});
      this.label = new St.Label({text: '', y_expand: true, 
         y_align: Clutter.ActorAlign.CENTER});
      box.add_child(this.icon);
      box.add_child(this.label);
      this.actor.add_actor(box);

      //Initial population of the menu
      this._set_icon();
      this._update_menu();

      //Refresh the menu every REFRESH_TIME seconds
      //this._refresh_details();
   },

   _netctlOff: function(){
      GLib.spawn_command_line_sync("netctl-auto disable-all")
   },

   _netctlOn: function(){
      GLib.spawn_command_line_sync("netctl-auto enable-all")
   },

   _get_network_profiles: function() {
      var profileString = GLib.spawn_command_line_sync("netctl-auto list")[1].toString();
      var profileArray = profileString.split("\n")
         return profileArray.splice(0, profileArray.length - 1)
   },

   _get_vpn_profiles: function() {
      var profileString = GLib.spawn_command_line_sync("netctl list")[1].toString();
      var profileArray = profileString.split("\n")
      var vpn = [];
      for(let i = 0; i < profileArray.length; i++){
         // Remove the asterisk character.  This pops up in active profiles.
         var isVpn = GLib.spawn_command_line_sync("netctl status " + profileArray[i].replace('*',''))[1].toString();
         if(isVpn.match('vpn')){
            vpn.push(profileArray[i]);
         }
         else {
             vpn.push(profileArray[i]);
             print('');
         }
      }
      return vpn.splice(0, vpn.length)

   },

   _get_connected_networks: function() {
      let networks =  GLib.spawn_command_line_sync("netctl-auto list")[1].toString();
      let connected = networks.match(/\*.*/g);
      return connected;
   },

   _switch_to_profile: function(profileName) {
      this._execute_async("/usr/bin/netctl-auto switch-to " + profileName);
   },

   _switch_to_vpn_profile: function(profileName) {
      this._execute_async("/usr/bin/netctl restart " + profileName);
   },

   _execute_async: function(command) {
      try {
         let [result, argv] = GLib.shell_parse_argv(command);
         GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
      }
      catch (e) {
         global.logError(e);
      }
   },

   _update_menu: function() {
      this.menu.removeAll();

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_('netctl-auto')));
      var profiles = this._get_network_profiles();
      for(let i = 0; i < profiles.length; i++){
         this._add_profile_menu_item(profiles[i]);
      }

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_('netctl')));
      var profiles = this._get_vpn_profiles();
      for(let i = 0; i < profiles.length; i++){
         this._add_vpn_menu_item(profiles[i]);
      }
      this.netctlOffMenuItem = new PopupMenu.PopupMenuItem(_('Wireless Off'));
      this.netctlOnMenuItem  = new PopupMenu.PopupMenuItem(_('Wireless On'));
      this.netctlOffMenuItem.connect('activate', Lang.bind(this, this._netctlOff));
      this.netctlOnMenuItem.connect('activate', Lang.bind(this, this._netctlOn));
      this.menu.addMenuItem(this.netctlOnMenuItem);
      this.menu.addMenuItem(this.netctlOffMenuItem);
   },

   _add_old_profile_menu_item: function(profile) {
      if(! profile.match(/\*.*/g)) {
         let menuItem = new PopupMenu.PopupMenuItem(profile);
         this.menu.addMenuItem(menuItem);
         menuItem.connect('activate', Lang.bind(this, function() {
            this._switch_to_profile(profile);
         }));
      } else {
         this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_(profile)));
      }
   },

   _add_profile_menu_item: function(profile) {
     let submenu = new netctlStatusSubMenu(profile.replace('*', '').replace(' ', ''), isAVpn=false);
     this.menu.addMenuItem(submenu);
   },

   _add_vpn_menu_item: function(profile) {
     let submenu = new netctlStatusSubMenu(profile.replace('*', '').replace(' ', ''), isAVpn=true);
     this.menu.addMenuItem(submenu);
   },

   _set_icon: function(){
      if(this._get_connected_networks() == null){
          this.icon.icon_name = NETWORK_OFFLINE;
      } else {
          this.icon.icon_name = NETWORK_CONNECTED;
      }
   },

   _refresh_details: function() {
      event = GLib.timeout_add_seconds(0, REFRESH_TIME, Lang.bind(this, function () {
         this._set_icon();
         this._update_menu();
         return true;
      }));
   }

});


let netctlSwitcher;

function init() {
}

function enable() {
   netctlSwitcher = new NetctlSwitcher();
   Main.panel.addToStatusArea('NetctlSwitcher', netctlSwitcher);
   //let netMenu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
   //netMenu.addMenuItem(netctlSwitcher, netMenu._getMenuItems().length+1);
	//let volMen = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
	//let items = volMen._getMenuItems();
	//let i = 0;
	//while (i < items.length)
	//	if (items[i] === volMen._output.item)
//			break;
//		else
	//		i++;
  // volMenu.addMenuItem(netctlSwitcher, i+1);
}

function disable() {
   netctlSwitcher.destroy();
}

