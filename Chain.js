// The code is commented in FRENCH. Sorry about that.

// ce constructeur crée un objet de type "Object3D", donc pouvant être affiché
// par Three.js, représentant une chaîne polygonale au moyen d'une séries
// de sphères et de cylindres
Chain = function() {

    THREE.Object3D.call( this );

    // une chaîne polygonale sera dessinée en 3D par des sphères et des cylindres
    this.spheres = [];
    this.cylinders = [];
    this.size = 0;  // nombre de segments, pas nombre de sommets !

    // pour éclaircir la fonction update la construction des nouvelles géométries
    // est rassemblée dans deux petites fonctions

    var detail = 2;

    function makeSphere() {
        var geometry = new THREE.SphereGeometry( 1, detail*4, detail*3 );
        var material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
        return new THREE.Mesh( geometry, material );
    }

    // Par défaut THREE.CylinderGeometry nous donne un cylindre centré en l'origine,
    // et de hauteur l'axe Y. C'est pas pratique pour la suite, alors je le translate
    // et rotationne de manière à avoir un cylindre de hauteur l'axe Y, et pas centrée
    // en l'origine, avec la base dans le plan Z=0.
    function makeCylinder() {
        var geometry = new THREE.CylinderGeometry( 0.5, 0.5, 1, detail*4 );
        geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0, -1/2, 0) );
        geometry.applyMatrix( new THREE.Matrix4().makeRotationX( -Math.PI/2 ) );
        var material = new THREE.MeshPhongMaterial( { color: 0x7f7f7f } );
        return new THREE.Mesh( geometry, material );
    }
    // Idée : ce serait peut être plus rapide, plutôt que cette fonction, de construire
    // une fois un seul cylindre comme on veut, et ensuite utiliser cylinder.clone()...

    // points = un tableau de THREE.Vector3, les sommets de la chaîne polygonale
    // une suite de sphères et de cylindres est construite à partir de cette donnée
    this.update = function( points ) {

        // Construire des nouvelles géométries coûte cher, par contre simplement modifier
        // la position / orientation d'un object déja construit peut se faire rapidemment.
        // On essaye de tirer parti de ça en minimisant les appels à makeSphere et makeCylinder.

        // pas oublier : n points = n sphères et n-1 cylindres
        var n = points.length;
        this.size = n - 1;

        // les n-1 premières sphères et les n-1 cylindres
        for ( var i = 0 ; i < n-1 ; i++ ) {

            // pas déjà de sphère pour le i-ème sommet ? on en crée une nouvelle
            if ( this.spheres[i] === undefined ) {
                this.spheres[i] = makeSphere();
                this.add( this.spheres[i] );
            }

            // idem pour les cylindres
            if ( this.cylinders[i] === undefined ) {

                this.cylinders[i] = makeCylinder();
                this.add( this.cylinders[i] );
            }

            // la sphère est en position i
            this.spheres[i].position.copy( points[i] );

            // le cylindre est en position i et "regarde" vers i+1
            this.cylinders[i].position.copy( points[i] );
            this.cylinders[i].lookAt( points[i+1] );

            // le cylindre (de hauteur 1) est agrandi d'un facteur d(i, i+1)
            this.cylinders[i].scale.z = points[i].distanceTo( points[i+1] );
        }

        // la n-ème sphère
        if ( this.spheres[n-1] === undefined ) {
            this.spheres[n-1] = makeSphere();
            this.add( this.spheres[n-1] );
        }
        this.spheres[n-1].position.copy( points[n-1] );

        // peut-être a-t-on trop de sphères et cylindres, car la taille de la chaîne
        // vient d'être diminuée ? il ne faut pas oublier de retirer les objets surnuméraires !
        while ( n < this.spheres.length ) this.remove( this.spheres.pop() );
        if ( n > 0 ) n--; // si 0 sphères, on a 0 cylindres, et pas -1 cylindres !
        while ( n < this.cylinders.length ) this.remove( this.cylinders.pop() );
    }
};
Chain.prototype = Object.create( THREE.Object3D.prototype );



// conversion paramètres (len, theta, delta) --> coordonnées des sommets
function params2points( param, origin ) {

    // d'abord la conversion paramètres --> vecteurs directeurs

    function rotate( vector, axis, angle ) {
        vector.applyMatrix4( new THREE.Matrix4().makeRotationAxis( axis, angle*Math.PI/180 ) );
    }


    var size = param.length;

    var e = [];

    var thetaAxis = new THREE.Vector3( 0, 0, 1 );
    var deltaAxis = new THREE.Vector3( 1, 0, 0 );
    var edge = deltaAxis;

    var matrix = new THREE.Matrix4();

    for ( var i = 0 ; i < size ; i++ ) {

        edge = new THREE.Vector3().copy( edge );

        edge.setLength( param[i][0] );
        rotate( edge, thetaAxis, param[i][1] );
        rotate( edge, deltaAxis, param[i][2] );

        e.push( edge );

        rotate( thetaAxis, deltaAxis, param[i][2] );
        deltaAxis.copy( edge ).normalize();
    }

    // ensuite la conversion vecteurs directeurs --> sommets

    var p = [];

    if ( origin === undefined ) p.push( new THREE.Vector3() );
    else p.push( new THREE.Vector3().copy(origin) );

    for ( var i = 0 ; i < e.length ; i++ ) {

        p.push( new THREE.Vector3().addVectors( p[i], e[i] ) );
    }

    return p;
}

function points2params( p ) {

    var e = [];
    e.push( new THREE.Vector3( 0,-1, 0 ) );
    e.push( new THREE.Vector3( 1, 0, 0 ) );

    for ( var i = 1 ; i < p.length ; i++ ) {

        e.push( new THREE.Vector3().subVectors( p[i], p[i-1] ) );
    }

    param = [];

    for ( var i = 2 ; i < e.length ; i++ ) {

        var len = e[i].length();

        var theta = e[i-1].angleTo( e[i] ) * 180/Math.PI;

        var cross1 = new THREE.Vector3().crossVectors( e[i-2], e[i-1] );
        var cross2 = new THREE.Vector3().crossVectors( e[i-1], e[i] );
        var delta = cross1.angleTo( cross2 ) * 180/Math.PI;

        param.push( [len, theta, delta] );

    }

    return param;
}






