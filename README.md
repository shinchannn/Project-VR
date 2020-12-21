# CSCI 5619 Project - "Target Practice" Game
### Kevin Bradt, Xin Jiang

## Asset Credits
World Mesh:  
  Artist: TBModels@cgtrader.com  
  Model: POLYGON - Island Pack Free low-poly 3D model  
  URL: https://www.cgtrader.com/free-3d-models/exterior/landscape/polygon-island-pack  

Rifle Mesh:
  Artist: abiyasamusyafa
  Model: Infanty Assault Rifle 3D model Free low-poly 3D model
  URL: https://www.cgtrader.com/free-3d-models/military/gun/infanty-assault-rifle-3d-model

Archery Mesh:
  Artist: diolater
  Model: Bow Simple Medieval Low-poly 3D model
  URL: https://www.cgtrader.com/3d-models/military/gun/bow-simple-medieval-b129b53b-e580-460c-ae3c-374584b2cbe1

Hatchet Mesh:
  Artist: mfischer3d
  Model: Hatchet Free low-poly 3D model
  URL: https://www.cgtrader.com/free-3d-models/military/melee/hatchet-2927052b-5d08-4a62-980c-19a35824b28c

Sound Effect - Gun Load: 
  URL: https://www.soundsnap.com/node/6864

Sound Effect - Gun shot: 
  URL: https://www.soundsnap.com/ak_47_machine_gun_single_shot_close_perspective_01_sfxbible_ss06722

Sound Effect - Arrow Swoosh: 
  URL: https://www.soundsnap.com/swishswoosh_052_wav

Sound Effect - JetPack Flame: 
  URL: https://www.soundsnap.com/node/69310

## Features
### Weapon Panel GUI
Upon pressing y on the left controller, a panel GUI will appear in front of the user. This panel contains the meshes of grabbable items in the game scaled down to fit inside the panel. Upon grabbing a mesh (with either grip button), the mesh will scale to game size and align to the orientation of the grabbing hand.

### Targets
Targets will automatically generate and float towards the user on the xz plane. The targets consist of two meshes so that different parts of the target can be distinguised from one another when using targeting assistance (V.A.T.S.).

### V.A.T.S.
Upon pressing x on the left controller, all targets will be slowed until the button is released. While targets are being slowed, they will be highlighted when properly targeted with the rifle.

### Jetpack
Upon pressing a on the right controller, the jet pack will be equipped or unequipped (toggle). While the jetpack is equipped leaning in any direction will move you in that direction on the x-z plane. Pressing the right trigger will move you upwards, and pressing the left trigger will move you down. Movement on the xz plane is based on the angle between the y axis and the line extending from the midpoint of your hands to the headset (lean).

### Throwing Hatchet
While holding the hatchet (grip button down), you can release the grip button to drop or throw it. This uses the cannon physics engine and tracks motion of the hand to determine the direction the hatchet is thrown.

### Archery
While holding the bow (grip button down), if you press the grip button on your other hand an arrow will appear in your hand. With the arrow in hand, if you bring your hands together it will "notch" the arrow, fixing its alignment to match that of the bow. While an arrow is notched you can move your hands further apart to draw the arrow back. Upon releasing the grip button on the hand holding the arrow while the arrow is notched, the arrow will be fired. A fired arrows velocity is directly proportional to the distance between your hands, and the direction of the arrow matches the vector extending from the hand holding the arrow to the hand holding the bow. Arrows in flight are physics imposters using the cannon physics engine.

### Marksmanship
While holding the rifle (grip button down), if you press the trigger button on the same hand that is holding the rifle, the rifle will fire. This uses ray casting as opposed to firing a physics imposter mesh. If the ray intersects a target object the target object will be destroyed.
