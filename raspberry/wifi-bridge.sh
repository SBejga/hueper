#!/bin/bash
#
# Site: www.hackhappy.org
# Article: http://hackhappy.org/uncategorized/how-to-use-a-raspberry-pi-to-create-a-wireless-to-wired-network-bridge/
# Video: http://youtu.be/FlLLmacDqJU
# Description: Shells script to configure linux to forward traffic
# from wireless to ethernet. This is useful if you do not have wire 
# access to the router.
#
# modified by kryops <github.com/kryops>
#

# root check

if [ "$(whoami)" != "root" ]; then
    echo "This script must be run with root privileges!"
    echo "Try sudo $0"
    exit 1
fi


function Configure () {
	clear
	echo "############################################################"
	echo "# Configure linux to connect wifi network to wired network #"
	echo "############################################################"
	echo ""
	echo -n "Input LAN IP [192.168.0.1]: "
	read lip
	if [ "$lip" = "" ]; then
			lip="192.168.0.1"
	fi

	echo -n "Input LAN Netmask [255.255.255.0]: "
	read netmask
	if [ "$netmask" = "" ]; then
			netmask="255.255.255.0"
	fi

	echo -n "Input LAN Subnet [192.168.0.0]: "
	read subnet
	if [ "$subnet" = "" ]; then
			subnet="192.168.0.0"
	fi

	echo -n "Input IP Range Start [192.168.0.2]: "
	read ipstart
	if [ "$ipstart" = "" ]; then
			ipstart="192.168.0.2"
	fi

	echo -n "Input IP Range End [192.168.0.200]: "
	read ipend
	if [ "$ipend" = "" ]; then
			ipend="192.168.0.200"
	fi

	echo -n "Input Wifi SSID: "
	read ssid
	echo -n "Input Wifi Password: "
	read password

	echo -n "Input LAN Device [eth0]: "
	read landv
	if [ "$land" = "" ]; then
			land="eth0"
	fi

	echo -n "Input Wifi Device [wlan0]: "
	read wifid
	if [ "$wifid" = "" ]; then
			wifid="wlan0"
	fi
	
	#Update system software
	clear
	echo ""
	echo "##### Updating OS & Apps. This may take some time..."
	echo ""
	apt-get update
	apt-get -y upgrade
		
	#Configure devices
	echo "
			auto lo $land
					iface lo inet loopback
			iface $land inet static
							address $lip
							netmask $netmask

			auto $wifid
			iface $wifid inet dhcp
			wpa-ssid \"$ssid\"
			wpa-psk \"$password\"

			up iptables-restore < /etc/iptables.ipv4.nat
	" > /etc/network/interfaces
	
	#install and configure the DHCP server
	clear
	echo "##### Installing and Configuring DHCP Server..."
	echo "##### If you see any errors this is expected behaviour. Don't panic..."
	echo ""
	apt-get -y install isc-dhcp-server 
	echo "
			option domain-name \"wifi2lan.rpi\";
			option domain-name-servers 8.8.8.8, 8.8.4.4;
			subnet $subnet netmask $netmask {
					range $ipstart $ipend;
					option routers $lip;
			}
	" > /etc/dhcp/dhcpd.conf
	clear
	echo "##### Restarting DHCP Server..."
	echo ""
	echo "INTERFACES=\"$land\"" >  /etc/default/isc-dhcp-server
	service isc-dhcp-server restart
	update-rc.d isc-dhcp-server enable

	# add sleep command to DHCP server config to delay its startup
	sed -i '/^		start-stop-daemon --start --quiet --pidfile "$DHCPD_PID" \\/c sleep 10\n		start-stop-daemon --start --quiet --pidfile "$DHCPD_PID" \\' /etc/init.d/isc-dhcp-server


	#Install and configure iptables
	clear
	 echo "##### Installing and Configuring IP Forwarding..."
	 echo ""
	 apt-get -y install iptables 
	 echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
	 echo "1" > /proc/sys/net/ipv4/ip_forward
	 iptables -t nat -A POSTROUTING -o $wifid -j MASQUERADE
	 iptables -A FORWARD -i $wifid -o $land -m state --state RELATED,ESTABLISHED -j ACCEPT
	 iptables -A FORWARD -i $land -o $wifid -j ACCEPT
	 iptables-save > /etc/iptables.ipv4.nat
	
	clear
	echo "##### Installation Complete."
	echo "##### Reboot or restart networking to apply new network configuration: sudo /etc/init.d/networking"


 }
 
Configure
