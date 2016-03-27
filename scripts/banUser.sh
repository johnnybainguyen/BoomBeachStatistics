#1/bin/sh
BLOCKDB="~/BoomBeachDataMining/scripts/ip.blocked"
IPS=$(grep -Ev "^#" $BLOCKDB)
for i in $IPS
do
iptables -A INPUT -s $i -j DROP
iptables -A OUTPUT -d $i -j DROP
done
